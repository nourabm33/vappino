import type { OrderDocument } from "./types";

type NotifiableOrder = Pick<
  OrderDocument,
  "orderRef" | "customerName" | "customerPhone" | "customerNotes" | "items" | "total"
>;

const dt = (amount: number) => `${amount.toLocaleString("fr-FR")} DT`;

function itemLabel(item: NotifiableOrder["items"][number]): string {
  const spec =
    item.specification && !item.productName.toLowerCase().includes(item.specification.toLowerCase())
      ? ` (${item.specification})`
      : "";
  return `${item.productName}${spec} × ${item.quantity} — ${dt(item.subtotal)}`;
}

/** Owner notification built only from server-validated order data. */
export function buildOwnerMessage(order: NotifiableOrder): string {
  return [
    "🛒 NOUVELLE COMMANDE VAPPINO",
    "",
    `Référence: ${order.orderRef}`,
    "",
    "Client:",
    order.customerName,
    "",
    "Téléphone:",
    order.customerPhone,
    "",
    "Produits:",
    ...order.items.map((item) => `- ${itemLabel(item)}`),
    "",
    "Total:",
    dt(order.total),
    "",
    "Notes:",
    order.customerNotes || "—",
  ].join("\n");
}

/**
 * Body parameters for an approved template ({{1}}..{{6}}): reference, name,
 * phone, products, total, notes. Meta rejects newlines inside parameters.
 */
export function buildTemplateParams(order: NotifiableOrder): string[] {
  const flat = (value: string) => value.replace(/\s+/g, " ").trim();
  return [
    order.orderRef,
    flat(order.customerName),
    order.customerPhone,
    flat(order.items.map(itemLabel).join(" ; ")),
    dt(order.total),
    flat(order.customerNotes) || "—",
  ];
}
