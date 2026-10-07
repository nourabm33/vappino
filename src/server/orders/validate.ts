import { MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { normalizePhone, validateCheckout } from "@/lib/validation";
import { ApiError } from "../errors";
import type { OrderItemInput, ValidOrderInput } from "./types";

export const MAX_ORDER_LINES = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Converts accepted phone formats to E.164 (Tunisian numbers get +216). */
export function toE164(phone: string): string {
  const p = normalizePhone(phone);
  if (/^00216\d{8}$/.test(p)) return `+${p.slice(2)}`;
  if (/^\d{8}$/.test(p)) return `+216${p}`;
  return p;
}

function invalidQuantity(productId: string): ApiError {
  return new ApiError(
    400,
    "invalid_quantity",
    `Quantité invalide : chaque article doit avoir une quantité entière entre 1 et ${MAX_QUANTITY_PER_LINE}.`,
    { productId: productId.slice(0, 64) },
  );
}

/**
 * Validates the public order payload. Only ids, quantities and customer details
 * are read: any price/total fields sent by the client are ignored.
 */
export function parseOrderRequest(body: unknown): ValidOrderInput {
  if (!isRecord(body)) throw new ApiError(400, "invalid_body", "Requête invalide.");
  const { customerName, customerPhone, customerNotes, items } = body;

  if (typeof customerName !== "string" || !customerName.trim()) {
    throw new ApiError(400, "invalid_customer_name", "Veuillez indiquer votre nom complet.", { field: "customerName" });
  }
  if (typeof customerPhone !== "string" || !customerPhone.trim()) {
    throw new ApiError(400, "invalid_phone", "Veuillez indiquer votre numéro de téléphone.", { field: "customerPhone" });
  }
  if (customerNotes !== undefined && customerNotes !== null && typeof customerNotes !== "string") {
    throw new ApiError(400, "invalid_notes", "Remarques invalides.", { field: "customerNotes" });
  }
  const notes = (typeof customerNotes === "string" ? customerNotes : "")
    .replace(/\p{Cc}/gu, (c) => (c === "\n" ? c : ""))
    .trim();

  const errors = validateCheckout({ fullName: customerName, phone: customerPhone, notes });
  if (errors.fullName) throw new ApiError(400, "invalid_customer_name", errors.fullName, { field: "customerName" });
  if (errors.phone) throw new ApiError(400, "invalid_phone", errors.phone, { field: "customerPhone" });
  if (errors.notes) throw new ApiError(400, "invalid_notes", errors.notes, { field: "customerNotes" });

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "empty_cart", "Votre panier est vide.");
  }
  if (items.length > MAX_ORDER_LINES) {
    throw new ApiError(400, "too_many_items", "Votre commande contient trop d'articles.");
  }
  const parsed: OrderItemInput[] = items.map((item) => {
    if (!isRecord(item) || typeof item.productId !== "string" || !item.productId) {
      throw new ApiError(400, "invalid_product", "Un produit de votre panier est invalide.");
    }
    const { quantity } = item;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw invalidQuantity(item.productId);
    }
    return { productId: item.productId, quantity };
  });

  return {
    customerName: customerName.trim().replace(/\s+/g, " "),
    customerPhone: toE164(customerPhone),
    customerNotes: notes,
    items: parsed,
  };
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function parseIdempotencyKey(header: string | null): string | null {
  if (header === null || header === "") return null;
  if (!IDEMPOTENCY_KEY_PATTERN.test(header)) {
    throw new ApiError(400, "invalid_idempotency_key", "Requête invalide.");
  }
  return header;
}

export { invalidQuantity };
