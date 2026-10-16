import { describe, expect, it } from "vitest";
import { getProductById } from "@/data/products";
import { resolveLines } from "@/lib/cart";
import { ORDER_WHATSAPP_NUMBER, buildWhatsAppOrderMessage, buildWhatsAppOrderUrl } from "@/lib/whatsapp";

const lines = resolveLines([
  { productId: "mazaya-80k", quantity: 2 },
  { productId: "fakher-60k", quantity: 1 },
]);
const order = {
  reference: "VAP-20261015-AB12",
  fullName: "Ahmed Ben Ali",
  phone: "20 123 456",
  address: "12 rue de Marseille & co, Tunis #3",
  notes: "Livraison le soir ?",
  lines,
  total: lines.reduce((sum, l) => sum + l.lineTotal, 0),
};

describe("wa.me click-to-chat order", () => {
  it("lists products, quantities, prices, total and delivery details", () => {
    const text = buildWhatsAppOrderMessage(order);
    expect(getProductById("mazaya-80k")!.price).toBe(65);
    expect(text).toContain("*Référence :* VAP-20261015-AB12");
    expect(text).toContain("- 2 x Mazaya 80K — 65 DT = 130 DT");
    expect(text).toContain("- 1 x Fakher 60K — 60 DT = 60 DT");
    expect(text).toContain("*Total : 190 DT*");
    expect(text).toContain("Nom : Ahmed Ben Ali");
    expect(text).toContain("Téléphone : 20 123 456");
    expect(text).toContain("Adresse : 12 rue de Marseille & co, Tunis #3");
    expect(text).toContain("Remarques : Livraison le soir ?");
  });

  it("omits the reference and notes when absent", () => {
    const text = buildWhatsAppOrderMessage({ ...order, reference: null, notes: "" });
    expect(text).not.toContain("Référence");
    expect(text).not.toContain("Remarques");
  });

  it("builds a properly encoded wa.me URL to the business number", () => {
    expect(ORDER_WHATSAPP_NUMBER).toBe("21651144339");
    const url = new URL(buildWhatsAppOrderUrl(order));
    expect(url.origin + url.pathname).toBe("https://wa.me/21651144339");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(buildWhatsAppOrderMessage(order));
    expect(url.search.slice("?text=".length)).not.toMatch(/[ &#?\n]/);
  });
});
