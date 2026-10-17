import type { Db } from "mongodb";
import { isDuplicateKeyError } from "@/server/db";
import { ApiError } from "@/server/errors";
import type { OrderDocument } from "@/server/orders/types";
import type {
  AdminOrder,
  ArchiveSummary,
  DailyStat,
  PeriodInfo,
  ProductStat,
  Stats,
  WeeklyStat,
} from "@/lib/admin/types";

/** Tunisia is UTC+1 all year (no DST since 2009). Days and weeks are counted in Tunis time. */
export const TIMEZONE = "Africa/Tunis";
const OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MAX_RANGE_DAYS = 93;
const MAX_ORDERS = 5000;
const MAX_ARCHIVE_BACKFILL = 104;

export const ARCHIVE_COLLECTION = "weekly_reports";

export interface WeeklyArchiveDocument {
  _id: string;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
  generatedAt: Date;
  /** Immutable snapshot: orders and statistics of the closed week. */
  stats: Stats;
  orders: AdminOrder[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function dayKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function dayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - OFFSET_MS);
}

/** Weekly reporting period: Monday 00:00 → next Monday 00:00 (Tunis time). */
export function periodFor(date: Date): PeriodInfo {
  const local = new Date(date.getTime() + OFFSET_MS);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  const start = dayStart(dayKey(new Date(date.getTime() - sinceMonday * DAY_MS)));
  return toPeriod(start);
}

function toPeriod(start: Date): PeriodInfo {
  return { key: dayKey(start), start: start.toISOString(), end: new Date(start.getTime() + WEEK_MS).toISOString() };
}

export function parsePeriodKey(key: unknown): PeriodInfo {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(Date.parse(key))) {
    throw new ApiError(400, "invalid_week", "Semaine invalide.");
  }
  const period = periodFor(dayStart(key));
  if (period.key !== key) throw new ApiError(400, "invalid_week", "Une semaine commence un lundi.");
  return period;
}

/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive Tunis days). Defaults to the current period. */
export function parseRange(from: string | null, to: string | null, now: Date): { from: string; to: string; start: Date; end: Date } {
  const valid = (v: string | null) => v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const fromKey = valid(from) ? from! : periodFor(now).key;
  const toKey = valid(to) ? to! : dayKey(now);
  const start = dayStart(fromKey);
  const end = new Date(dayStart(toKey).getTime() + DAY_MS);
  if (end <= start) throw new ApiError(400, "invalid_range", "La date de fin doit être après la date de début.");
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    throw new ApiError(400, "invalid_range", `Choisissez une période de ${MAX_RANGE_DAYS} jours maximum.`);
  }
  return { from: fromKey, to: toKey, start, end };
}

/** ADMIN_PRODUCT_COSTS: JSON map of productId → unit cost in TND, e.g. {"mazaya-80k":50}. */
export function readProductCosts(env: NodeJS.ProcessEnv = process.env): Record<string, number> | null {
  const raw = env.ADMIN_PRODUCT_COSTS?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    const costs: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) costs[id] = value;
    }
    return Object.keys(costs).length > 0 ? costs : null;
  } catch {
    console.error("[admin] ADMIN_PRODUCT_COSTS is not valid JSON; profit is disabled");
    return null;
  }
}

export const countsForSales = (status: string) => status !== "cancelled";

export function toAdminOrder(doc: OrderDocument): AdminOrder {
  return {
    orderRef: doc.orderRef,
    createdAt: new Date(doc.createdAt).toISOString(),
    customerName: doc.customerName,
    items: doc.items.map(({ productId, productName, specification, quantity, unitPrice, subtotal }) => ({
      productId,
      productName,
      specification,
      quantity,
      unitPrice,
      subtotal,
    })),
    total: doc.total,
    status: doc.status,
  };
}

export function computeStats(
  orders: AdminOrder[],
  range: { start: Date; end: Date },
  costs: Record<string, number> | null,
): Stats {
  const sales = orders.filter((o) => countsForSales(o.status));
  const missing = new Set<string>();
  const lineCost = (productId: string, quantity: number) => {
    const unit = costs?.[productId];
    if (unit === undefined) {
      missing.add(productId);
      return 0;
    }
    return unit * quantity;
  };

  const days = new Map<string, { orderCount: number; revenue: number; cost: number }>();
  for (let t = range.start.getTime(); t < range.end.getTime(); t += DAY_MS) {
    days.set(dayKey(new Date(t)), { orderCount: 0, revenue: 0, cost: 0 });
  }
  const weeks = new Map<string, { period: PeriodInfo; orderCount: number; revenue: number; cost: number }>();
  for (let t = periodFor(range.start).start; Date.parse(t) < range.end.getTime(); ) {
    const period = periodFor(new Date(t));
    weeks.set(period.key, { period, orderCount: 0, revenue: 0, cost: 0 });
    t = period.end;
  }
  const products = new Map<string, { productName: string; quantity: number; revenue: number; cost: number }>();

  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  for (const order of sales) {
    const created = new Date(order.createdAt);
    const day = days.get(dayKey(created));
    const week = weeks.get(periodFor(created).key);
    let orderCost = 0;
    for (const item of order.items) {
      const c = lineCost(item.productId, item.quantity);
      orderCost += c;
      itemsSold += item.quantity;
      const p = products.get(item.productId) ?? { productName: item.productName, quantity: 0, revenue: 0, cost: 0 };
      p.quantity += item.quantity;
      p.revenue += item.subtotal;
      p.cost += c;
      products.set(item.productId, p);
    }
    revenue += order.total;
    cost += orderCost;
    for (const bucket of [day, week]) {
      if (!bucket) continue;
      bucket.orderCount += 1;
      bucket.revenue += order.total;
      bucket.cost += orderCost;
    }
  }

  const hasProfit = costs !== null && missing.size === 0;
  const profitOf = (r: number, c: number) => (hasProfit ? round(r - c) : null);

  const daily: DailyStat[] = [...days].map(([date, d]) => ({
    date,
    orderCount: d.orderCount,
    revenue: round(d.revenue),
    profit: profitOf(d.revenue, d.cost),
  }));
  const weekly: WeeklyStat[] = [...weeks.values()].map((w) => ({
    periodKey: w.period.key,
    periodStart: w.period.start,
    periodEnd: w.period.end,
    orderCount: w.orderCount,
    revenue: round(w.revenue),
    profit: profitOf(w.revenue, w.cost),
  }));
  const topProducts: ProductStat[] = [...products]
    .map(([productId, p]) => ({
      productId,
      productName: p.productName,
      quantity: p.quantity,
      revenue: round(p.revenue),
      profit: profitOf(p.revenue, p.cost),
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  return {
    orderCount: orders.length,
    salesOrderCount: sales.length,
    revenue: round(revenue),
    itemsSold,
    averageOrder: sales.length ? round(revenue / sales.length) : 0,
    profit: profitOf(revenue, cost),
    cost: hasProfit ? round(cost) : null,
    costsConfigured: costs !== null,
    missingCosts: costs ? [...missing].sort() : [],
    daily,
    weekly,
    topProducts,
  };
}

export async function findOrders(db: Db, start: Date, end: Date): Promise<AdminOrder[]> {
  const docs = await db
    .collection<OrderDocument>("orders")
    .find({ createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: -1 })
    .limit(MAX_ORDERS)
    .toArray();
  return docs.map(toAdminOrder);
}

/**
 * Closes every finished week that has no snapshot yet. Snapshots are insert-only
 * ($setOnInsert): an existing report is never overwritten, and no order is deleted
 * or modified — the "reset" only moves the dashboard to the new week.
 */
export async function ensureWeeklyArchives(db: Db, now: Date, costs: Record<string, number> | null): Promise<void> {
  const archives = db.collection<WeeklyArchiveDocument>(ARCHIVE_COLLECTION);
  const current = periodFor(now);
  const latest = await archives.find({}, { projection: { periodEnd: 1 } }).sort({ periodStart: -1 }).limit(1).next();
  let from: Date;
  if (latest) {
    from = latest.periodEnd;
  } else {
    const first = await db
      .collection<OrderDocument>("orders")
      .find({}, { projection: { createdAt: 1 } })
      .sort({ createdAt: 1 })
      .limit(1)
      .next();
    if (!first) return;
    from = new Date(periodFor(new Date(first.createdAt)).start);
  }

  for (let i = 0; i < MAX_ARCHIVE_BACKFILL && from < new Date(current.start); i++) {
    const period = toPeriod(from);
    const start = new Date(period.start);
    const end = new Date(period.end);
    const orders = await findOrders(db, start, end);
    try {
      await archives.updateOne(
        { _id: period.key },
        {
          $setOnInsert: {
            periodStart: start,
            periodEnd: end,
            timezone: TIMEZONE,
            generatedAt: now,
            stats: computeStats(orders, { start, end }, costs),
            orders,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
    from = end;
  }
}

export async function listArchives(db: Db, limit = 26): Promise<ArchiveSummary[]> {
  const docs = await db
    .collection<WeeklyArchiveDocument>(ARCHIVE_COLLECTION)
    .find({}, { projection: { orders: 0 } })
    .sort({ periodStart: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    key: d._id,
    periodStart: d.periodStart.toISOString(),
    periodEnd: d.periodEnd.toISOString(),
    orderCount: d.stats.orderCount,
    revenue: d.stats.revenue,
    profit: d.stats.profit,
    generatedAt: d.generatedAt.toISOString(),
  }));
}

export async function getArchive(db: Db, key: string): Promise<WeeklyArchiveDocument | null> {
  return db.collection<WeeklyArchiveDocument>(ARCHIVE_COLLECTION).findOne({ _id: key });
}
