import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { GET as dashboard } from "@/app/api/admin/dashboard/route";
import { GET as reports } from "@/app/api/admin/reports/route";
import { closeMongo, getDatabase } from "@/server/db";
import { ADMIN_USERNAME, createSessionToken, readAdminConfig, verifySessionToken } from "@/server/admin/auth";
import { computeStats, dayKey, ensureWeeklyArchives, parsePeriodKey, periodFor } from "@/server/admin/reports";
import { dailyStatsPdf, ordersPdf, profitPdf, weeklyReportPdf } from "@/lib/admin/pdf";
import type { AdminOrder, DashboardResponse, WeeklyReportResponse } from "@/lib/admin/types";

const DB = "vappino_admin_test";
const PASSWORD = "correct-horse-battery-42";
let mongo: MongoMemoryServer;
let client: MongoClient;
let ip = 0;

const orders = () => client.db(DB).collection("orders");
const archives = () => client.db(DB).collection("weekly_reports");

function order(ref: string, createdAt: string, items: [string, string, number, number][], status = "received") {
  const lines = items.map(([productId, productName, quantity, unitPrice]) => ({
    productId,
    productName,
    specification: null,
    quantity,
    unitPrice,
    subtotal: quantity * unitPrice,
  }));
  return {
    orderRef: ref,
    customerName: `Client ${ref}`,
    customerPhone: "+21620123456",
    customerAddress: "Tunis",
    customerNotes: "",
    items: lines,
    total: lines.reduce((s, l) => s + l.subtotal, 0),
    currency: "TND",
    status,
    whatsappStatus: "click_to_chat",
    whatsappMessageId: null,
    whatsappError: null,
    whatsappAttempts: 0,
    fingerprint: ref,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  };
}

const req = (path: string, init: RequestInit & { cookie?: string } = {}) =>
  new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      "x-forwarded-for": `192.168.1.${++ip % 250}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...(init.headers as Record<string, string>),
    },
  });

async function sessionCookie(): Promise<string> {
  const res = await login(req("/api/admin/login", { method: "POST", body: JSON.stringify({ username: ADMIN_USERNAME, password: PASSWORD }) }));
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), MONGODB_DB: DB, ADMIN_PASSWORD: PASSWORD });
  client = await MongoClient.connect(mongo.getUri());
});

afterAll(async () => {
  await closeMongo();
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  delete process.env.ADMIN_PRODUCT_COSTS;
  await orders().deleteMany({});
  await archives().deleteMany({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("admin login", () => {
  it("is disabled without ADMIN_PASSWORD", async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await login(req("/api/admin/login", { method: "POST", body: JSON.stringify({ username: ADMIN_USERNAME, password: "x" }) }));
    expect(res.status).toBe(503);
    expect((await dashboard(req("/api/admin/dashboard"))).status).toBe(503);
  });

  it("rejects a wrong username or password", async () => {
    for (const body of [
      { username: ADMIN_USERNAME, password: "wrong-password-123" },
      { username: "admin", password: PASSWORD },
      {},
    ]) {
      const res = await login(req("/api/admin/login", { method: "POST", body: JSON.stringify(body) }));
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("sets an HttpOnly, SameSite=Strict session cookie and logout clears it", async () => {
    const res = await login(req("/api/admin/login", { method: "POST", body: JSON.stringify({ username: ADMIN_USERNAME, password: PASSWORD }) }));
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).not.toContain(PASSWORD);
    const out = await logout(req("/api/admin/logout", { method: "POST" }));
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("rate-limits repeated attempts from one IP", async () => {
    const attempt = () =>
      login(
        req("/api/admin/login", {
          method: "POST",
          body: JSON.stringify({ username: ADMIN_USERNAME, password: "nope-nope-nope" }),
          headers: { "x-forwarded-for": "203.0.113.9" },
        }),
      );
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await attempt()).status);
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it("rejects cross-site login attempts", async () => {
    const res = await login(
      req("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: ADMIN_USERNAME, password: PASSWORD }),
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects tampered, expired or foreign tokens", () => {
    const config = readAdminConfig()!;
    const token = createSessionToken(config);
    expect(verifySessionToken(token, config)).toBe(true);
    expect(verifySessionToken(`${token}x`, config)).toBe(false);
    expect(verifySessionToken(createSessionToken(config, Date.now() - 9 * 3600_000), config)).toBe(false);
    const other = readAdminConfig({ ...process.env, ADMIN_PASSWORD: "another-password-123", ADMIN_SESSION_SECRET: "" })!;
    expect(verifySessionToken(createSessionToken(other), config)).toBe(false);
  });
});

describe("dashboard API", () => {
  it("requires a session", async () => {
    expect((await dashboard(req("/api/admin/dashboard"))).status).toBe(401);
    expect((await dashboard(req("/api/admin/dashboard", { cookie: "vappino_admin=forged.token" }))).status).toBe(401);
    expect((await reports(req("/api/admin/reports"))).status).toBe(401);
  });

  it("returns only order-management fields for the requested range", async () => {
    const now = new Date();
    await orders().insertOne(order("VAP-A", now.toISOString(), [["mazaya-80k", "Mazaya 80K", 2, 65]]));
    const cookie = await sessionCookie();
    const res = await dashboard(req(`/api/admin/dashboard?from=${dayKey(now)}&to=${dayKey(now)}`, { cookie }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DashboardResponse;
    expect(body.orders).toHaveLength(1);
    expect(Object.keys(body.orders[0]!).sort()).toEqual(["createdAt", "customerName", "items", "orderRef", "status", "total"]);
    expect(JSON.stringify(body)).not.toContain("+21620123456");
    expect(body.stats).toMatchObject({ orderCount: 1, revenue: 130, itemsSold: 2, profit: null, costsConfigured: false });
  });

  it("rejects invalid date ranges", async () => {
    const cookie = await sessionCookie();
    expect((await dashboard(req("/api/admin/dashboard?from=2026-10-10&to=2026-10-01", { cookie }))).status).toBe(400);
    expect((await dashboard(req("/api/admin/dashboard?from=2026-01-01&to=2026-10-01", { cookie }))).status).toBe(400);
  });
});

describe("statistics", () => {
  const sample: AdminOrder[] = [
    { orderRef: "1", createdAt: "2026-10-12T08:00:00Z", customerName: "A", status: "received", total: 130,
      items: [{ productId: "mazaya-80k", productName: "Mazaya 80K", specification: null, quantity: 2, unitPrice: 65, subtotal: 130 }] },
    { orderRef: "2", createdAt: "2026-10-12T22:30:00Z", customerName: "B", status: "received", total: 60,
      items: [{ productId: "fakher-60k", productName: "Fakher 60K", specification: null, quantity: 1, unitPrice: 60, subtotal: 60 }] },
    { orderRef: "3", createdAt: "2026-10-13T10:00:00Z", customerName: "C", status: "cancelled", total: 65,
      items: [{ productId: "mazaya-80k", productName: "Mazaya 80K", specification: null, quantity: 1, unitPrice: 65, subtotal: 65 }] },
  ];
  const range = { start: new Date("2026-10-11T23:00:00Z"), end: new Date("2026-10-18T23:00:00Z") };

  it("groups by Tunis day, ranks products and excludes cancelled orders from revenue", () => {
    const stats = computeStats(sample, range, null);
    expect(stats).toMatchObject({ orderCount: 3, salesOrderCount: 2, revenue: 190, itemsSold: 3, averageOrder: 95, profit: null });
    expect(stats.daily).toHaveLength(7);
    // 22:30 UTC on the 12th is 23:30 in Tunis, still the 12th; it is grouped with the first order.
    expect(stats.daily[0]).toMatchObject({ date: "2026-10-12", orderCount: 2, revenue: 190 });
    expect(stats.topProducts[0]).toMatchObject({ productId: "mazaya-80k", quantity: 2 });
    expect(stats.weekly).toHaveLength(1);
  });

  it("shows profit only when every sold product has a cost", () => {
    expect(computeStats(sample, range, { "mazaya-80k": 50 })).toMatchObject({ profit: null, missingCosts: ["fakher-60k"] });
    const full = computeStats(sample, range, { "mazaya-80k": 50, "fakher-60k": 45 });
    expect(full).toMatchObject({ profit: 45, cost: 145 });
  });

  it("uses Monday 00:00 Tunis time as the weekly boundary", () => {
    expect(periodFor(new Date("2026-10-18T22:59:59Z")).key).toBe("2026-10-12");
    expect(periodFor(new Date("2026-10-18T23:00:00Z")).key).toBe("2026-10-19");
    expect(() => parsePeriodKey("2026-10-14")).toThrow();
  });
});

describe("weekly reset", () => {
  it("archives finished weeks once, never deletes or changes orders", async () => {
    await orders().insertMany([
      order("VAP-W1", "2026-09-29T10:00:00Z", [["mazaya-80k", "Mazaya 80K", 1, 65]]),
      order("VAP-W3", "2026-10-14T10:00:00Z", [["fakher-60k", "Fakher 60K", 2, 60]]),
      order("VAP-NOW", "2026-10-20T10:00:00Z", [["fakher-60k", "Fakher 60K", 1, 60]]),
    ]);
    const before = await orders().find().sort({ orderRef: 1 }).toArray();
    const db = await getDatabase();
    const now = new Date("2026-10-21T12:00:00Z");

    await ensureWeeklyArchives(db, now, null);
    const keys = (await archives().find().sort({ _id: 1 }).toArray()).map((a) => a._id);
    expect(keys).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    const w3 = await archives().findOne({ _id: "2026-10-12" as never });
    expect(w3?.stats.revenue).toBe(120);
    expect(w3?.orders.map((o: AdminOrder) => o.orderRef)).toEqual(["VAP-W3"]);

    // Re-running (or a concurrent run) never overwrites a snapshot, even if data changed.
    await orders().insertOne(order("VAP-LATE", "2026-10-13T10:00:00Z", [["mazaya-80k", "Mazaya 80K", 1, 65]]));
    await Promise.all([ensureWeeklyArchives(db, now, null), ensureWeeklyArchives(db, now, null)]);
    expect(await archives().countDocuments()).toBe(3);
    expect((await archives().findOne({ _id: "2026-10-12" as never }))?.stats.revenue).toBe(120);

    const after = await orders().find({ orderRef: { $ne: "VAP-LATE" } }).sort({ orderRef: 1 }).toArray();
    expect(after).toEqual(before);
  });

  it("serves the current week live and past weeks from their snapshot", async () => {
    const now = new Date();
    const lastWeek = new Date(Date.parse(periodFor(now).start) - 3 * 86_400_000);
    await orders().insertMany([
      order("VAP-OLD", lastWeek.toISOString(), [["mazaya-80k", "Mazaya 80K", 1, 65]]),
      order("VAP-CUR", now.toISOString(), [["fakher-60k", "Fakher 60K", 1, 60]]),
    ]);
    const cookie = await sessionCookie();
    const dash = (await (await dashboard(req("/api/admin/dashboard", { cookie }))).json()) as DashboardResponse;
    expect(dash.orders.map((o) => o.orderRef)).toEqual(["VAP-CUR"]);
    expect(dash.archives.map((a) => a.key)).toContain(periodFor(lastWeek).key);

    const current = (await (await reports(req("/api/admin/reports", { cookie }))).json()) as WeeklyReportResponse;
    expect(current).toMatchObject({ status: "open", stats: { revenue: 60 } });
    const past = (await (await reports(req(`/api/admin/reports?week=${periodFor(lastWeek).key}`, { cookie }))).json()) as WeeklyReportResponse;
    expect(past).toMatchObject({ status: "archived", stats: { revenue: 65 } });
    expect(await orders().countDocuments()).toBe(2);
  });
});

describe("PDF exports", () => {
  it("builds the four PDFs", () => {
    const o: AdminOrder[] = [
      { orderRef: "VAP-20261017-QGGR", createdAt: "2026-10-17T10:16:23Z", customerName: "Élodie Ben Salah", status: "received", total: 60,
        items: [{ productId: "fakher-60k", productName: "Fakher 60K", specification: "60K", quantity: 1, unitPrice: 60, subtotal: 60 }] },
    ];
    const range = { start: new Date("2026-10-11T23:00:00Z"), end: new Date("2026-10-18T23:00:00Z") };
    const stats = computeStats(o, range, null);
    const period = periodFor(new Date("2026-10-17T10:00:00Z"));
    for (const doc of [
      ordersPdf(o, "12/10/2026 - 18/10/2026"),
      dailyStatsPdf(stats, "12/10/2026 - 18/10/2026"),
      weeklyReportPdf({ period, status: "open", stats, orders: o }),
      profitPdf(stats, "12/10/2026 - 18/10/2026"),
      profitPdf(computeStats(o, range, { "fakher-60k": 45 }), "12/10/2026 - 18/10/2026"),
    ]) {
      const bytes = new Uint8Array(doc.output("arraybuffer"));
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(1000);
    }
  });
});
