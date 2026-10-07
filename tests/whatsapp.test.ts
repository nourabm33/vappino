import { describe, expect, it, vi } from "vitest";
import { readWhatsAppConfig } from "@/server/config";
import { buildOwnerMessage, buildTemplateParams } from "@/server/orders/message";
import { WhatsAppError, logWhatsAppError, sendWhatsAppMessage } from "@/server/whatsapp";
import { META_OK_ID, WA_ENV, metaAccepted, metaError, metaResponse } from "./helpers";

const config = readWhatsAppConfig(WA_ENV as unknown as NodeJS.ProcessEnv).config!;

describe("WhatsApp Cloud API client", () => {
  it("reports missing environment variables", () => {
    const { config: c, missing } = readWhatsAppConfig({ WHATSAPP_PHONE_NUMBER_ID: "1" } as unknown as NodeJS.ProcessEnv);
    expect(c).toBeNull();
    expect(missing).toEqual(["WHATSAPP_ACCESS_TOKEN", "OWNER_WHATSAPP_NUMBER"]);
  });

  it("returns the message id when Meta accepts the message", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => metaAccepted());
    const result = await sendWhatsAppMessage(config, "21651144339", { type: "text", body: "hello" }, { fetchImpl });
    expect(result).toEqual({ messageId: META_OK_ID });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v21.0/1356616710875243/messages");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer test-access-token-SECRET");
    expect(JSON.parse(init!.body as string)).toMatchObject({
      messaging_product: "whatsapp",
      to: "21651144339",
      type: "text",
      text: { body: "hello" },
    });
  });

  it("sends template messages when a template is configured", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => metaAccepted());
    const tpl = { ...config, templateName: "nouvelle_commande" };
    await sendWhatsAppMessage(tpl, "21651144339", { type: "template", params: ["a", "b"] }, { fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string).template).toEqual({
      name: "nouvelle_commande",
      language: { code: "fr" },
      components: [{ type: "body", parameters: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }],
    });
  });

  it("maps Meta auth errors (code 190)", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => metaError(401, 190, "Error validating access token"));
    const error = await sendWhatsAppMessage(config, "1", { type: "text", body: "x" }, { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(WhatsAppError);
    expect(error).toMatchObject({ kind: "auth", httpStatus: 401, metaCode: 190, fbtraceId: "TRACE123" });
  });

  it("maps Meta API errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      metaError(400, 131047, "Re-engagement message"),
    );
    const error = await sendWhatsAppMessage(config, "1", { type: "text", body: "x" }, { fetchImpl }).catch((e) => e);
    expect(error).toMatchObject({ kind: "api", httpStatus: 400, metaCode: 131047, message: "Re-engagement message" });
  });

  it("maps network failures and malformed responses", async () => {
    const network = await sendWhatsAppMessage(config, "1", { type: "text", body: "x" }, {
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    }).catch((e) => e);
    expect(network).toMatchObject({ kind: "network" });

    const invalid = await sendWhatsAppMessage(config, "1", { type: "text", body: "x" }, {
      fetchImpl: async () => metaResponse(200, { ok: true }),
    }).catch((e) => e);
    expect(invalid).toMatchObject({ kind: "invalid_response" });
  });

  it("never logs the access token", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn<typeof fetch>(async () => metaError(401, 190, "Invalid OAuth access token"));
    const error = await sendWhatsAppMessage(config, "1", { type: "text", body: "x" }, { fetchImpl }).catch((e) => e);
    logWhatsAppError("test", error);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(WA_ENV.WHATSAPP_ACCESS_TOKEN);
    spy.mockRestore();
  });
});

describe("owner notification message", () => {
  const order = {
    orderRef: "VAP-20261007-AB12",
    customerName: "Ahmed Ben Ali",
    customerPhone: "+21620123456",
    customerNotes: "Livraison\nle soir",
    items: [
      { productId: "mazaya-80k", productName: "Mazaya 80K", specification: "80K", quantity: 1, unitPrice: 65, subtotal: 65 },
      { productId: "x", productName: "Nexpod 30K Kit", specification: "30K", quantity: 2, unitPrice: 50, subtotal: 100 },
    ],
    total: 165,
  };

  it("builds the French text message", () => {
    expect(buildOwnerMessage(order)).toBe(
      [
        "🛒 NOUVELLE COMMANDE VAPPINO",
        "",
        "Référence: VAP-20261007-AB12",
        "",
        "Client:",
        "Ahmed Ben Ali",
        "",
        "Téléphone:",
        "+21620123456",
        "",
        "Produits:",
        "- Mazaya 80K × 1 — 65 DT",
        "- Nexpod 30K Kit × 2 — 100 DT",
        "",
        "Total:",
        "165 DT",
        "",
        "Notes:",
        "Livraison\nle soir",
      ].join("\n"),
    );
  });

  it("builds newline-free template parameters", () => {
    const params = buildTemplateParams(order);
    expect(params).toHaveLength(6);
    expect(params.every((p) => !p.includes("\n"))).toBe(true);
    expect(params[4]).toBe("165 DT");
  });
});
