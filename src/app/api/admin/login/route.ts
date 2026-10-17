import { errorResponse, getClientIp, json, readJsonBody } from "@/server/http";
import {
  SESSION_TTL_SECONDS,
  assertSameOrigin,
  checkCredentials,
  createSessionToken,
  requireAdminConfig,
  sessionCookie,
} from "@/server/admin/auth";
import { createRateLimiter } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const perIp = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });
const globalLimiter = createRateLimiter({ limit: 30, windowMs: 15 * 60_000 });

export async function POST(req: Request) {
  try {
    const config = requireAdminConfig();
    assertSameOrigin(req);
    const ip = perIp.check(getClientIp(req));
    const all = ip.allowed ? globalLimiter.check("all") : ip;
    if (!all.allowed) {
      return json(
        { success: false, error: "rate_limited", message: "Trop de tentatives. Réessayez dans quelques minutes." },
        429,
        { "Retry-After": String(all.retryAfterSeconds) },
      );
    }
    const body = (await readJsonBody(req, 2_000)) as { username?: unknown; password?: unknown } | null;
    if (!checkCredentials(body?.username, body?.password, config)) {
      return json({ success: false, error: "invalid_credentials", message: "Identifiant ou mot de passe incorrect." }, 401);
    }
    return json({ success: true }, 200, {
      "Set-Cookie": sessionCookie(req, createSessionToken(config), SESSION_TTL_SECONDS),
    });
  } catch (error) {
    return errorResponse(error, {}, "admin-login");
  }
}
