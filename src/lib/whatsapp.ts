import type { CartLine } from "./cart";
import { formatPrice } from "./format";

/** Business WhatsApp number that receives orders (international format, digits only). */
export const ORDER_WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_ORDER_WHATSAPP_NUMBER || "21651144339").replace(/\D/g, "");

export interface WhatsAppOrderDetails {
  reference: string | null;
  fullName: string;
  phone: string;
  address: string;
  notes: string;
  lines: Pick<CartLine, "product" | "quantity" | "lineTotal">[];
  total: number;
}

function lineLabel({ product, quantity, lineTotal }: WhatsAppOrderDetails["lines"][number]): string {
  const spec =
    product.specification && !product.name.toLowerCase().includes(product.specification.toLowerCase())
      ? ` (${product.specification})`
      : "";
  return `- ${quantity} x ${product.name}${spec} — ${formatPrice(product.price)} = ${formatPrice(lineTotal)}`;
}

/** Plain-text order sent by the customer to the shop on WhatsApp (*…* renders bold in WhatsApp). */
export function buildWhatsAppOrderMessage(order: WhatsAppOrderDetails): string {
  return [
    "Bonjour VAPPINO, je souhaite passer cette commande :",
    ...(order.reference ? ["", `*Référence :* ${order.reference}`] : []),
    "",
    "*Produits*",
    ...order.lines.map(lineLabel),
    "",
    `*Total : ${formatPrice(order.total)}*`,
    "",
    "*Livraison*",
    `Nom : ${order.fullName}`,
    `Téléphone : ${order.phone}`,
    `Adresse : ${order.address}`,
    ...(order.notes ? [`Remarques : ${order.notes}`] : []),
  ].join("\n");
}

export function buildWhatsAppUrl(text: string, number: string = ORDER_WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppOrderUrl(order: WhatsAppOrderDetails, number?: string): string {
  return buildWhatsAppUrl(buildWhatsAppOrderMessage(order), number);
}
