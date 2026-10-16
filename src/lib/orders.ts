import { BASE_PATH } from "./assets";
import type { StoredCartLine } from "./cart";
import type { CheckoutValues } from "./validation";
import { normalizePhone } from "./validation";

/**
 * Payload sent to POST /api/orders. Only product ids and quantities are sent:
 * the server recomputes every price and the total from its own catalog.
 */
export interface OrderRequest {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes: string;
  items: StoredCartLine[];
}

export interface ConfirmedOrder {
  reference: string;
  total: number;
  currency: "TND";
  createdAt: string;
}

/** Last order placed in this tab, shown on /order-success with its WhatsApp link. */
export interface PlacedOrder {
  /** Backend reference, or null when the order could not be saved (WhatsApp still carries it). */
  reference: string | null;
  total: number;
  currency: "TND";
  createdAt: string;
  whatsappUrl: string;
}

export interface OrderFailure {
  code: string;
  message: string | null;
  orderRef: string | null;
}

export const LAST_ORDER_STORAGE_KEY = "vappino.lastOrder.v1";
export const LAST_ORDER_ERROR_STORAGE_KEY = "vappino.lastOrderError.v1";

const API_URL = process.env.NEXT_PUBLIC_ORDERS_API_URL || `${BASE_PATH}/api/orders`;
/** The backend only records the order: past this delay the customer goes on to WhatsApp anyway. */
const API_TIMEOUT_MS = 6000;

export class OrderSubmissionError extends Error {
  constructor(readonly failure: OrderFailure) {
    super(failure.code);
  }
}

export function buildOrderRequest(values: CheckoutValues, items: StoredCartLine[]): OrderRequest {
  return {
    customerName: values.fullName.trim(),
    customerPhone: normalizePhone(values.phone),
    customerAddress: values.address.trim(),
    customerNotes: values.notes.trim(),
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
  };
}

export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** POSTs the order and resolves only when the backend confirms it was processed. */
export async function submitOrder(request: OrderRequest, idempotencyKey: string): Promise<ConfirmedOrder> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch {
    throw new OrderSubmissionError({ code: "network", message: null, orderRef: null });
  } finally {
    clearTimeout(timer);
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON response */
  }

  if (response.ok && data?.success === true && typeof data.orderRef === "string" && typeof data.total === "number") {
    return { reference: data.orderRef, total: data.total, currency: "TND", createdAt: new Date().toISOString() };
  }
  throw new OrderSubmissionError({
    code: typeof data?.error === "string" ? data.error : `http_${response.status}`,
    message: typeof data?.message === "string" ? data.message : null,
    orderRef: typeof data?.orderRef === "string" ? data.orderRef : null,
  });
}

function writeSession(key: string, value: unknown): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLastOrder(order: PlacedOrder): void {
  writeSession(LAST_ORDER_STORAGE_KEY, order);
}

export function readLastOrder(): PlacedOrder | null {
  const order = readSession<PlacedOrder>(LAST_ORDER_STORAGE_KEY);
  return order && typeof order.whatsappUrl === "string" ? order : null;
}

export function saveLastOrderError(failure: OrderFailure): void {
  writeSession(LAST_ORDER_ERROR_STORAGE_KEY, failure);
}

export function clearLastOrderError(): void {
  writeSession(LAST_ORDER_ERROR_STORAGE_KEY, null);
}

export function readLastOrderError(): OrderFailure | null {
  return readSession<OrderFailure>(LAST_ORDER_ERROR_STORAGE_KEY);
}
