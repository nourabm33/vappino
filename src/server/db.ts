import { MongoClient, type Collection } from "mongodb";
import { ApiError } from "./errors";
import type { OrderDocument } from "./orders/types";

interface MongoState {
  uri: string;
  client: Promise<MongoClient>;
  indexes: Promise<unknown> | null;
}

const globalForMongo = globalThis as typeof globalThis & { __vappinoMongo?: MongoState };

export function databaseUnavailable(): ApiError {
  return new ApiError(
    503,
    "database_unavailable",
    "Le service de commande est momentanément indisponible. Veuillez réessayer dans quelques instants.",
  );
}

/** Strips credentials from driver messages before logging. */
export function safeDbMessage(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
  return message.replace(/\/\/[^@/\s]+@/g, "//<credentials>@").slice(0, 300);
}

export async function getOrdersCollection(): Promise<Collection<OrderDocument>> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error("[db] MONGODB_URI is not set");
    throw databaseUnavailable();
  }
  if (!globalForMongo.__vappinoMongo || globalForMongo.__vappinoMongo.uri !== uri) {
    const client = new MongoClient(uri, {
      appName: "vappino",
      serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS) || 5000,
    });
    globalForMongo.__vappinoMongo = { uri, client: client.connect(), indexes: null };
  }
  const state = globalForMongo.__vappinoMongo;
  try {
    const client = await state.client;
    const orders = client.db(process.env.MONGODB_DB || "vappino").collection<OrderDocument>("orders");
    state.indexes ??= ensureIndexes(orders);
    await state.indexes;
    return orders;
  } catch (error) {
    if (globalForMongo.__vappinoMongo === state) globalForMongo.__vappinoMongo = undefined;
    console.error("[db] MongoDB unavailable:", safeDbMessage(error));
    throw databaseUnavailable();
  }
}

async function ensureIndexes(orders: Collection<OrderDocument>): Promise<void> {
  await orders.createIndexes([
    { key: { orderRef: 1 }, name: "orderRef_unique", unique: true },
    {
      key: { idempotencyKey: 1 },
      name: "idempotencyKey_unique",
      unique: true,
      partialFilterExpression: { idempotencyKey: { $type: "string" } },
    },
    { key: { fingerprint: 1, createdAt: -1 }, name: "fingerprint_createdAt" },
    { key: { status: 1, createdAt: -1 }, name: "status_createdAt" },
  ]);
}

export async function closeMongo(): Promise<void> {
  const state = globalForMongo.__vappinoMongo;
  globalForMongo.__vappinoMongo = undefined;
  if (!state) return;
  try {
    await (await state.client).close();
  } catch {
    /* connection never opened */
  }
}

export function isDuplicateKeyError(error: unknown, field?: string): boolean {
  if (!error || typeof error !== "object" || (error as { code?: unknown }).code !== 11000) return false;
  if (!field) return true;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern ? field in keyPattern : String((error as Error).message).includes(field);
}
