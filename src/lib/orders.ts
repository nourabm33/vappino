import type { StoredCartLine } from "./cart";
import type { CheckoutValues } from "./validation";
import { normalizePhone } from "./validation";

/**
 * Payload sent to POST /api/orders. Only product ids and quantities are sent:
 * prices and totals must be recomputed server-side (PART 2).
 */
export interface OrderRequest {
  customer: { fullName: string; phone: string };
  notes?: string;
  items: StoredCartLine[];
}

export interface OrderResponse {
  reference: string;
  total: number;
  currency: "TND";
}

export interface ConfirmedOrder extends OrderResponse {
  createdAt: string;
  /** True when the order was only simulated in the browser (no backend). */
  simulated: boolean;
}

export const LAST_ORDER_STORAGE_KEY = "vappino.lastOrder.v1";

const API_URL = process.env.NEXT_PUBLIC_ORDERS_API_URL ?? "";

export class OrderSubmissionError extends Error {}

export function buildOrderRequest(values: CheckoutValues, items: StoredCartLine[]): OrderRequest {
  const notes = values.notes.trim();
  return {
    customer: { fullName: values.fullName.trim(), phone: normalizePhone(values.phone) },
    ...(notes ? { notes } : {}),
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
  };
}

/** Format: VAP-YYYYMMDD-XXXX */
export function generateOrderReference(date = new Date()): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `VAP-${ymd}-${suffix}`;
}

/**
 * Submits the order. When NEXT_PUBLIC_ORDERS_API_URL is set (e.g. "/api/orders"),
 * the request is POSTed to the backend. Otherwise the order is simulated locally
 * so the frontend flow can be exercised before PART 2 ships.
 */
export async function submitOrder(
  request: OrderRequest,
  estimatedTotal: number,
): Promise<ConfirmedOrder> {
  const createdAt = new Date().toISOString();

  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      reference: generateOrderReference(),
      total: estimatedTotal,
      currency: "TND",
      createdAt,
      simulated: true,
    };
  }

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new OrderSubmissionError("network");
  }
  if (!response.ok) throw new OrderSubmissionError(`http_${response.status}`);

  const data = (await response.json()) as Partial<OrderResponse>;
  if (typeof data.reference !== "string" || typeof data.total !== "number") {
    throw new OrderSubmissionError("invalid_response");
  }
  return {
    reference: data.reference,
    total: data.total,
    currency: "TND",
    createdAt,
    simulated: false,
  };
}

export function saveLastOrder(order: ConfirmedOrder): void {
  try {
    sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* storage unavailable */
  }
}

export function readLastOrder(): ConfirmedOrder | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfirmedOrder) : null;
  } catch {
    return null;
  }
}
