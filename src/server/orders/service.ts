import { createHash } from "node:crypto";
import type { Collection, WithId } from "mongodb";
import { readWhatsAppConfig } from "../config";
import { getOrdersCollection, isDuplicateKeyError, safeDbMessage } from "../db";
import { ApiError } from "../errors";
import { WhatsAppError, logWhatsAppError, sendWhatsAppMessage } from "../whatsapp";
import { buildOwnerMessage, buildTemplateParams } from "./message";
import { generateOrderRef } from "./orderRef";
import { priceItems } from "./pricing";
import type { OrderDocument, OrderItem, ValidOrderInput, WhatsAppErrorInfo } from "./types";

export interface OrderServiceDeps {
  getCollection(): Promise<Collection<OrderDocument>>;
  notifyOwner(order: OrderDocument): Promise<{ messageId: string }>;
  now(): Date;
}

export interface ServiceResult {
  status: number;
  body: Record<string, unknown>;
}

/** Identical orders (same phone + items) within this window are treated as resubmissions. */
const DUPLICATE_WINDOW_MS = 2 * 60_000;
/** A "pending" order older than this is assumed abandoned mid-notification and may be retried. */
const STALE_PENDING_MS = 60_000;

export function defaultOrderDeps(): OrderServiceDeps {
  return {
    getCollection: getOrdersCollection,
    now: () => new Date(),
    async notifyOwner(order) {
      const { config, missing } = readWhatsAppConfig();
      if (!config) {
        throw new WhatsAppError("config", `Missing environment variables: ${missing.join(", ")}`);
      }
      return sendWhatsAppMessage(
        config,
        config.ownerNumber,
        config.templateName
          ? { type: "template", params: buildTemplateParams(order) }
          : { type: "text", body: buildOwnerMessage(order) },
      );
    },
  };
}

export function orderFingerprint(phone: string, items: OrderItem[]): string {
  const canonical = items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join("|");
  return createHash("sha256").update(`${phone}#${canonical}`).digest("hex");
}

function dbWriteError(error: unknown): ApiError {
  console.error("[orders] MongoDB write failed:", safeDbMessage(error));
  return new ApiError(
    503,
    "database_error",
    "Impossible d'enregistrer votre commande pour le moment. Veuillez réessayer dans quelques instants.",
  );
}

function successBody(order: Pick<OrderDocument, "orderRef" | "total" | "currency">, duplicate = false) {
  return {
    success: true,
    orderRef: order.orderRef,
    status: "notification_sent",
    total: order.total,
    currency: order.currency,
    ...(duplicate ? { duplicate: true } : {}),
  };
}

export async function createOrder(
  input: ValidOrderInput,
  idempotencyKey: string | null,
  deps: OrderServiceDeps,
): Promise<ServiceResult> {
  const priced = priceItems(input.items);
  const fingerprint = orderFingerprint(input.customerPhone, priced.items);
  const orders = await deps.getCollection();
  const now = deps.now();

  let existing: WithId<OrderDocument> | null;
  try {
    existing =
      (idempotencyKey ? await orders.findOne({ idempotencyKey }) : null) ??
      (await orders.findOne(
        { fingerprint, status: { $ne: "cancelled" }, createdAt: { $gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
        { sort: { createdAt: -1 } },
      ));
  } catch (error) {
    throw dbWriteError(error);
  }
  if (existing) return handleExisting(orders, existing, deps);

  let order: OrderDocument | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const doc: OrderDocument = {
      orderRef: generateOrderRef(now),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerNotes: input.customerNotes,
      items: priced.items,
      total: priced.total,
      currency: "TND",
      status: "pending",
      whatsappStatus: "pending",
      whatsappMessageId: null,
      whatsappError: null,
      whatsappAttempts: 0,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      fingerprint,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await orders.insertOne(doc);
      order = doc;
    } catch (error) {
      if (isDuplicateKeyError(error, "orderRef")) continue;
      if (idempotencyKey && isDuplicateKeyError(error, "idempotencyKey")) {
        const winner = await orders.findOne({ idempotencyKey });
        if (winner) return handleExisting(orders, winner, deps);
      }
      throw dbWriteError(error);
    }
  }
  if (!order) throw dbWriteError(new Error("could not allocate a unique orderRef"));

  return notify(orders, order, deps, 201);
}

async function handleExisting(
  orders: Collection<OrderDocument>,
  existing: WithId<OrderDocument>,
  deps: OrderServiceDeps,
): Promise<ServiceResult> {
  if (existing.status === "notification_sent" || existing.status === "confirmed") {
    return { status: 200, body: successBody(existing, true) };
  }
  if (existing.status === "cancelled") {
    return {
      status: 409,
      body: { success: false, error: "order_cancelled", orderRef: existing.orderRef, message: "Cette commande a été annulée." },
    };
  }

  const now = deps.now();
  const stale = now.getTime() - existing.updatedAt.getTime() > STALE_PENDING_MS;
  if (existing.status === "pending" && !stale) {
    return {
      status: 409,
      body: {
        success: false,
        error: "order_in_progress",
        orderRef: existing.orderRef,
        message: "Votre commande est déjà en cours de traitement. Merci de patienter quelques secondes.",
      },
    };
  }

  // Failed (or abandoned) notification: atomically claim the order, then retry once.
  const claimed = await orders.findOneAndUpdate(
    { _id: existing._id, status: existing.status, updatedAt: existing.updatedAt },
    { $set: { status: "pending", updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!claimed) {
    return {
      status: 409,
      body: {
        success: false,
        error: "order_in_progress",
        orderRef: existing.orderRef,
        message: "Votre commande est déjà en cours de traitement. Merci de patienter quelques secondes.",
      },
    };
  }
  return notify(orders, claimed, deps, 200);
}

function toErrorInfo(error: unknown, at: Date): WhatsAppErrorInfo {
  if (error instanceof WhatsAppError) {
    return { kind: error.kind, httpStatus: error.httpStatus, code: error.metaCode, message: error.message, at };
  }
  return { kind: "unknown", httpStatus: null, code: null, message: "Unexpected notification error", at };
}

async function notify(
  orders: Collection<OrderDocument>,
  order: OrderDocument,
  deps: OrderServiceDeps,
  successStatus: number,
): Promise<ServiceResult> {
  try {
    const { messageId } = await deps.notifyOwner(order);
    await orders
      .updateOne(
        { orderRef: order.orderRef },
        {
          $set: { status: "notification_sent", whatsappStatus: "sent", whatsappMessageId: messageId, whatsappError: null, updatedAt: deps.now() },
          $inc: { whatsappAttempts: 1 },
        },
      )
      .catch((error: unknown) =>
        console.error(`[orders] ${order.orderRef}: status update after WhatsApp success failed:`, safeDbMessage(error)),
      );
    return { status: successStatus, body: successBody(order) };
  } catch (error) {
    const info = toErrorInfo(error, deps.now());
    if (error instanceof WhatsAppError) logWhatsAppError(`notification for ${order.orderRef}`, error);
    else console.error(`[orders] ${order.orderRef}: unexpected notification error`);
    await orders
      .updateOne(
        { orderRef: order.orderRef },
        {
          $set: { status: "failed", whatsappStatus: "failed", whatsappError: info, updatedAt: info.at },
          $inc: { whatsappAttempts: 1 },
        },
      )
      .catch((dbError: unknown) =>
        console.error(`[orders] ${order.orderRef}: could not record notification failure:`, safeDbMessage(dbError)),
      );
    return {
      status: info.kind === "config" ? 503 : 502,
      body: {
        success: false,
        error: "notification_failed",
        orderRef: order.orderRef,
        status: "failed",
        total: order.total,
        currency: order.currency,
        message: `Votre commande ${order.orderRef} a bien été enregistrée, mais nous n'avons pas pu prévenir notre équipe automatiquement. Réessayez dans quelques instants : votre commande ne sera pas dupliquée.`,
      },
    };
  }
}
