import type { WhatsAppConfig } from "./config";

export type WhatsAppErrorKind = "config" | "auth" | "api" | "network" | "timeout" | "invalid_response";

export class WhatsAppError extends Error {
  constructor(
    readonly kind: WhatsAppErrorKind,
    message: string,
    readonly httpStatus: number | null = null,
    readonly metaCode: number | null = null,
    readonly fbtraceId: string | null = null,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export type WhatsAppPayload = { type: "text"; body: string } | { type: "template"; params: string[] };

export interface SendOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface MetaErrorBody {
  error?: { message?: string; code?: number; fbtrace_id?: string; error_data?: { details?: string } };
}

/** Sends a message through the official WhatsApp Business Cloud API (graph.facebook.com). */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  payload: WhatsAppPayload,
  { fetchImpl = fetch, timeoutMs = 10_000 }: SendOptions = {},
): Promise<{ messageId: string }> {
  const url = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  const message =
    payload.type === "text"
      ? { type: "text", text: { preview_url: false, body: payload.body.slice(0, 4096) } }
      : {
          type: "template",
          template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: [
              { type: "body", parameters: payload.params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) },
            ],
          },
        };

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...message }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new WhatsAppError(
      timedOut ? "timeout" : "network",
      timedOut ? "Meta API request timed out" : `Network error calling Meta API: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    const err = (data as MetaErrorBody | null)?.error;
    const code = typeof err?.code === "number" ? err.code : null;
    const kind: WhatsAppErrorKind = response.status === 401 || code === 190 ? "auth" : "api";
    const text = [err?.message, err?.error_data?.details].filter(Boolean).join(" — ") || `HTTP ${response.status}`;
    throw new WhatsAppError(kind, text.slice(0, 500), response.status, code, err?.fbtrace_id ?? null);
  }

  const id = (data as { messages?: { id?: unknown }[] } | null)?.messages?.[0]?.id;
  if (typeof id !== "string") {
    throw new WhatsAppError("invalid_response", "Meta API response did not contain a message id", response.status);
  }
  return { messageId: id };
}

/** Logs safe diagnostics only (never the access token or request headers). */
export function logWhatsAppError(context: string, error: WhatsAppError): void {
  console.error(`[whatsapp] ${context} failed`, {
    kind: error.kind,
    httpStatus: error.httpStatus,
    code: error.metaCode,
    message: error.message,
    fbtraceId: error.fbtraceId,
  });
}
