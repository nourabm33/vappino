import { createHash, timingSafeEqual } from "node:crypto";
import { readWhatsAppConfig } from "@/server/config";
import { errorResponse, getClientIp, json } from "@/server/http";
import { createRateLimiter } from "@/server/rateLimit";
import { WhatsAppError, logWhatsAppError, sendWhatsAppMessage } from "@/server/whatsapp";
import { buildTemplateParams } from "@/server/orders/message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

function isAuthorized(header: string | null, adminKey: string): boolean {
  const match = header?.match(/^Bearer (.+)$/);
  if (!match?.[1]) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(adminKey));
}

function mask(number: string): string {
  return number.length > 4 ? `${"•".repeat(number.length - 4)}${number.slice(-4)}` : "••••";
}

/** Sends a real test message to OWNER_WHATSAPP_NUMBER. Requires `Authorization: Bearer <ADMIN_API_KEY>`. */
export async function POST(req: Request) {
  const rate = limiter.check(getClientIp(req));
  if (!rate.allowed) {
    return json({ success: false, error: "rate_limited", message: "Too many requests, try again later." }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const adminKey = process.env.ADMIN_API_KEY?.trim();
  if (!adminKey) {
    return json(
      { success: false, error: "test_endpoint_disabled", message: "ADMIN_API_KEY is not configured on the server." },
      503,
    );
  }
  if (!isAuthorized(req.headers.get("authorization"), adminKey)) {
    return json({ success: false, error: "unauthorized", message: "Missing or invalid admin key." }, 401);
  }

  const { config, missing } = readWhatsAppConfig();
  if (!config) {
    return json(
      {
        success: false,
        error: "whatsapp_config_missing",
        missing,
        message: `Missing server environment variables: ${missing.join(", ")}`,
      },
      500,
    );
  }

  try {
    const sentAt = new Date().toISOString();
    const { messageId } = await sendWhatsAppMessage(
      config,
      config.ownerNumber,
      config.templateName
        ? {
            type: "template",
            params: buildTemplateParams({
              orderRef: "VAP-TEST",
              customerName: "Test VAPPINO",
              customerPhone: "+21600000000",
              customerNotes: `Message de test ${sentAt}`,
              items: [],
              total: 0,
            }),
          }
        : { type: "text", body: `✅ Test VAPPINO\n\nL'intégration WhatsApp Cloud API fonctionne.\n${sentAt}` },
    );
    return json(
      { success: true, messageId, mode: config.templateName ? "template" : "text", to: mask(config.ownerNumber) },
      200,
    );
  } catch (error) {
    if (error instanceof WhatsAppError) {
      logWhatsAppError("test message", error);
      return json(
        {
          success: false,
          error: `whatsapp_${error.kind}`,
          httpStatus: error.httpStatus,
          metaCode: error.metaCode,
          fbtraceId: error.fbtraceId,
          message: error.message,
        },
        502,
      );
    }
    return errorResponse(error, {}, "test-whatsapp");
  }
}
