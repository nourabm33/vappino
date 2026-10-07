import { corsHeaders, errorResponse, getClientIp, json, preflight, readJsonBody } from "@/server/http";
import { createOrder, defaultOrderDeps } from "@/server/orders/service";
import { parseIdempotencyKey, parseOrderRequest } from "@/server/orders/validate";
import { createRateLimiter } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  if (cors === null) {
    return json({ success: false, error: "forbidden_origin", message: "Origine non autorisée." }, 403);
  }
  const rate = limiter.check(getClientIp(req));
  if (!rate.allowed) {
    return json(
      { success: false, error: "rate_limited", message: "Trop de tentatives. Veuillez réessayer dans quelques minutes." },
      429,
      { ...cors, "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  try {
    const input = parseOrderRequest(await readJsonBody(req, 16_000));
    const idempotencyKey = parseIdempotencyKey(req.headers.get("idempotency-key"));
    const result = await createOrder(input, idempotencyKey, defaultOrderDeps());
    return json(result.body, result.status, cors);
  } catch (error) {
    return errorResponse(error, cors, "orders");
  }
}
