import { errorResponse, json } from "@/server/http";
import { getDatabase } from "@/server/db";
import { ApiError } from "@/server/errors";
import { requireAdmin } from "@/server/admin/auth";
import {
  computeStats,
  ensureWeeklyArchives,
  findOrders,
  getArchive,
  parsePeriodKey,
  periodFor,
  readProductCosts,
} from "@/server/admin/reports";
import type { WeeklyReportResponse } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?week=YYYY-MM-DD (a Monday). The current week is computed live; past weeks come from their snapshot. */
export async function GET(req: Request) {
  try {
    requireAdmin(req);
    const now = new Date();
    const week = new URL(req.url).searchParams.get("week");
    const period = week ? parsePeriodKey(week) : periodFor(now);
    const costs = readProductCosts();
    const db = await getDatabase();

    if (new Date(period.start) > now) throw new ApiError(400, "invalid_week", "Cette semaine n'a pas encore commencé.");
    if (new Date(period.end) > now) {
      const orders = await findOrders(db, new Date(period.start), new Date(period.end));
      const body: WeeklyReportResponse = {
        success: true,
        status: "open",
        period,
        generatedAt: now.toISOString(),
        stats: computeStats(orders, { start: new Date(period.start), end: new Date(period.end) }, costs),
        orders,
      };
      return json(body, 200);
    }

    await ensureWeeklyArchives(db, now, costs);
    const archive = await getArchive(db, period.key);
    if (!archive) throw new ApiError(404, "report_not_found", "Aucun rapport pour cette semaine.");
    const body: WeeklyReportResponse = {
      success: true,
      status: "archived",
      period,
      generatedAt: archive.generatedAt.toISOString(),
      stats: archive.stats,
      orders: archive.orders,
    };
    return json(body, 200);
  } catch (error) {
    return errorResponse(error, {}, "admin-reports");
  }
}
