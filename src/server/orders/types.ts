export const ORDER_STATUSES = ["pending", "notification_sent", "confirmed", "cancelled", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type WhatsAppStatus = "pending" | "sent" | "failed";

export interface OrderItem {
  productId: string;
  productName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface WhatsAppErrorInfo {
  kind: string;
  httpStatus: number | null;
  code: number | null;
  message: string;
  at: Date;
}

export interface OrderDocument {
  orderRef: string;
  customerName: string;
  /** E.164, e.g. +21620123456 */
  customerPhone: string;
  customerNotes: string;
  items: OrderItem[];
  total: number;
  currency: "TND";
  status: OrderStatus;
  whatsappStatus: WhatsAppStatus;
  whatsappMessageId: string | null;
  whatsappError: WhatsAppErrorInfo | null;
  whatsappAttempts: number;
  idempotencyKey?: string;
  /** Hash of phone + items, used to catch accidental resubmissions without a key. */
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface ValidOrderInput {
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  items: OrderItemInput[];
}
