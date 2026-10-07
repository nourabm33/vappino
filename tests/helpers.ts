import { vi } from "vitest";

export const META_OK_ID = "wamid.TEST_ACCEPTED";

export function metaResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const metaAccepted = () =>
  metaResponse(200, {
    messaging_product: "whatsapp",
    contacts: [{ input: "21651144339", wa_id: "21651144339" }],
    messages: [{ id: META_OK_ID }],
  });

export const metaError = (status: number, code: number, message: string) =>
  metaResponse(status, { error: { message, type: "OAuthException", code, fbtrace_id: "TRACE123" } });

/** Replaces global fetch (only the Meta API uses fetch on the server). */
export function stubMetaFetch() {
  const fetchMock = vi.fn<typeof fetch>(async () => metaAccepted());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export const WA_ENV = {
  WHATSAPP_ACCESS_TOKEN: "test-access-token-SECRET",
  WHATSAPP_PHONE_NUMBER_ID: "1356616710875243",
  OWNER_WHATSAPP_NUMBER: "21651144339",
};
