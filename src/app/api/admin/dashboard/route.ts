import { errorResponse, json } from "@/server/http";
import { getDatabase } from "@/server/db";
import { requireAdmin } from "@/server/admin/auth";
import {
  TIMEZONE,
  computeStats,
  ensureWeeklyArchives,
  findOrders,
  listArchives,
  parseRange,
  periodFor,
  readProductCosts,
} from "@/server/admin/reports";
import type { DashboardResponse } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    const now = new Date();
    const params = new URL(req.url).searchParams;
    const range = parseRange(params.get("from"), params.get("to"), now);
    const costs = readProductCosts();
    const db = await getDatabase();
    await ensureWeeklyArchives(db, now, costs);
    const orders = await findOrders(db, range.start, range.end);
    const body: DashboardResponse = {
      success: true,
      generatedAt: now.toISOString(),
      timezone: TIMEZONE,
      period: periodFor(now),
      range: { from: range.from, to: range.to },
      stats: computeStats(orders, range, costs),
      orders,
      archives: await listArchives(db),
    };
    return json(body, 200);
  } catch (error) {
    return errorResponse(error, {}, "admin-dashboard");
  }
}
