import { readAllowedOrigins } from "./config";
import { ApiError } from "./errors";

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns CORS headers for the request, `{}` for same-origin/non-browser calls, or null if the origin is not allowed. */
export function corsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  const host = req.headers.get("host");
  if (origin === new URL(req.url).origin || (host && (origin === `https://${host}` || origin === `http://${host}`))) {
    return {};
  }
  if (readAllowedOrigins().includes(origin)) {
    return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
  }
  return null;
}

export function preflight(req: Request): Response {
  const cors = corsHeaders(req);
  if (cors === null) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
      "Access-Control-Max-Age": "600",
    },
  });
}

export function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "La requête doit être envoyée au format JSON.");
  }
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Requête trop volumineuse.");
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Requête trop volumineuse.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "invalid_body", "Requête invalide (JSON mal formé).");
  }
}

export function errorResponse(error: unknown, headers: Record<string, string> = {}, context = "api"): Response {
  if (error instanceof ApiError) {
    return json({ success: false, error: error.code, message: error.message, ...error.extra }, error.status, headers);
  }
  console.error(`[${context}] unexpected error:`, error instanceof Error ? error.name : "unknown");
  return json(
    { success: false, error: "internal_error", message: "Une erreur interne est survenue. Veuillez réessayer." },
    500,
    headers,
  );
}
