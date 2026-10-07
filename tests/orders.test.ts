import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/orders/route";
import { getProductById } from "@/data/products";
import { closeMongo } from "@/server/db";
import { ORDER_REF_PATTERN, generateOrderRef } from "@/server/orders/orderRef";
import { META_OK_ID, WA_ENV, metaError, stubMetaFetch } from "./helpers";

const DB = "vappino_test";
let mongo: MongoMemoryServer;
let client: MongoClient;
let fetchMock: ReturnType<typeof stubMetaFetch>;
let ipCounter = 0;

const price = (id: string) => getProductById(id)!.price;
const orders = () => client.db(DB).collection("orders");

const customer = { customerName: "Ahmed Ben Ali", customerPhone: "20 123 456", customerNotes: "Merci" };

function post(body: unknown, opts: { key?: string; ip?: string } = {}) {
  ipCounter++;
  return POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": opts.ip ?? `10.${Math.floor(ipCounter / 250)}.0.${ipCounter % 250}`,
        ...(opts.key ? { "idempotency-key": opts.key } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  Object.assign(process.env, WA_ENV, { MONGODB_URI: mongo.getUri(), MONGODB_DB: DB });
  client = await MongoClient.connect(mongo.getUri());
});

afterAll(async () => {
  await closeMongo();
  await client.close();
  await mongo.stop();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  await orders().deleteMany({});
  fetchMock = stubMetaFetch();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("order reference", () => {
  it("matches VAP-YYYYMMDD-XXXX", () => {
    const ref = generateOrderRef(new Date("2026-10-07T10:00:00Z"));
    expect(ref).toMatch(ORDER_REF_PATTERN);
    expect(ref.startsWith("VAP-20261007-")).toBe(true);
  });
});

describe("POST /api/orders", () => {
  it("1. creates a valid order, notifies the owner via Meta and stores it", async () => {
    const res = await post({ ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] }, { key: "key-valid-order-0001" });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ success: true, status: "notification_sent", total: 65, currency: "TND" });
    expect(body.orderRef).toMatch(ORDER_REF_PATTERN);

    const doc = await orders().findOne({ orderRef: body.orderRef });
    expect(doc).toMatchObject({
      customerName: "Ahmed Ben Ali",
      customerPhone: "+21620123456",
      customerNotes: "Merci",
      total: 65,
      currency: "TND",
      status: "notification_sent",
      whatsappStatus: "sent",
      whatsappMessageId: META_OK_ID,
      items: [{ productId: "mazaya-80k", productName: "Mazaya 80K", specification: "80K", quantity: 1, unitPrice: 65, subtotal: 65 }],
    });
    expect(doc!.createdAt).toBeInstanceOf(Date);
    expect(doc!.updatedAt).toBeInstanceOf(Date);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sent.to).toBe("21651144339");
    expect(sent.text.body).toContain("🛒 NOUVELLE COMMANDE VAPPINO");
    expect(sent.text.body).toContain(`Référence: ${body.orderRef}`);
    expect(sent.text.body).toContain("- Mazaya 80K × 1 — 65 DT");
    expect(JSON.stringify(body)).not.toContain(WA_ENV.WHATSAPP_ACCESS_TOKEN);
  });

  it("2. prices multiple products server-side", async () => {
    const res = await post({
      ...customer,
      items: [
        { productId: "mazaya-80k", quantity: 1 },
        { productId: "nexpod-30k-kit", quantity: 2 },
      ],
    });
    const body = await res.json();
    const expected = price("mazaya-80k") + 2 * price("nexpod-30k-kit");
    expect(res.status).toBe(201);
    expect(body.total).toBe(expected);
    expect((await orders().findOne({ orderRef: body.orderRef }))!.items).toHaveLength(2);
  });

  it("3. applies quantity changes and merges repeated lines", async () => {
    const res = await post({
      ...customer,
      items: [
        { productId: "fakher-60k", quantity: 3 },
        { productId: "fakher-60k", quantity: 2 },
      ],
    });
    const body = await res.json();
    expect(body.total).toBe(5 * price("fakher-60k"));
    const doc = await orders().findOne({ orderRef: body.orderRef });
    expect(doc!.items).toEqual([expect.objectContaining({ productId: "fakher-60k", quantity: 5, subtotal: 5 * price("fakher-60k") })]);
  });

  it.each([
    ["4. invalid product id", [{ productId: "does-not-exist", quantity: 1 }], "invalid_product"],
    ["4b. non-string product id", [{ productId: { $ne: null }, quantity: 1 }], "invalid_product"],
    ["5. quantity = 0", [{ productId: "mazaya-80k", quantity: 0 }], "invalid_quantity"],
    ["6. negative quantity", [{ productId: "mazaya-80k", quantity: -2 }], "invalid_quantity"],
    ["6b. fractional quantity", [{ productId: "mazaya-80k", quantity: 1.5 }], "invalid_quantity"],
    ["6c. string quantity", [{ productId: "mazaya-80k", quantity: "2" }], "invalid_quantity"],
    ["6d. quantity above max", [{ productId: "mazaya-80k", quantity: 100 }], "invalid_quantity"],
    ["7. empty cart", [], "empty_cart"],
  ])("%s → 400", async (_label, items, code) => {
    const res = await post({ ...customer, items });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false, error: code });
    expect(await orders().countDocuments()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["8. missing customer name", { customerName: "", customerPhone: "20123456" }, "invalid_customer_name"],
    ["8b. name not a string", { customerName: ["x"], customerPhone: "20123456" }, "invalid_customer_name"],
    ["9. invalid phone", { customerName: "Ahmed", customerPhone: "123" }, "invalid_phone"],
    ["9b. phone with letters", { customerName: "Ahmed", customerPhone: "2012abcd" }, "invalid_phone"],
  ])("%s → 400", async (_label, fields, code) => {
    const res = await post({ ...fields, items: [{ productId: "mazaya-80k", quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false, error: code });
    expect(await orders().countDocuments()).toBe(0);
  });

  it("rejects malformed JSON and non-JSON bodies", async () => {
    expect((await post("{not json")).status).toBe(400);
    const res = await POST(new Request("http://localhost/api/orders", { method: "POST", body: "a=b", headers: { "x-forwarded-for": "9.9.9.9" } }));
    expect(res.status).toBe(415);
  });

  it("10. returns 503 when MongoDB is unavailable, without notifying", async () => {
    const original = process.env.MONGODB_URI;
    await closeMongo();
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?directConnection=true";
    process.env.MONGODB_TIMEOUT_MS = "500";
    try {
      const res = await post({ ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] });
      const body = await res.json();
      expect(res.status).toBe(503);
      expect(body).toMatchObject({ success: false, error: "database_unavailable" });
      expect(JSON.stringify(body)).not.toContain("mongodb://");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await closeMongo();
      process.env.MONGODB_URI = original;
      delete process.env.MONGODB_TIMEOUT_MS;
    }
  });

  it("11. keeps the order when WhatsApp fails, and a retry with the same key re-notifies without duplicating", async () => {
    fetchMock.mockImplementationOnce(async () => metaError(400, 131047, "Re-engagement message"));
    const key = "key-wa-failure-0001";
    const payload = { ...customer, items: [{ productId: "mazaya-80k", quantity: 2 }] };

    const res = await post(payload, { key });
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body).toMatchObject({ success: false, error: "notification_failed", status: "failed", total: 130 });
    expect(body.orderRef).toMatch(ORDER_REF_PATTERN);

    const failed = await orders().findOne({ orderRef: body.orderRef });
    expect(failed).toMatchObject({
      status: "failed",
      whatsappStatus: "failed",
      whatsappAttempts: 1,
      whatsappError: { kind: "api", httpStatus: 400, code: 131047 },
    });

    const retry = await post(payload, { key });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ success: true, orderRef: body.orderRef, status: "notification_sent" });
    expect(await orders().countDocuments()).toBe(1);
    expect(await orders().findOne({ orderRef: body.orderRef })).toMatchObject({ status: "notification_sent", whatsappAttempts: 2 });
  });

  it("11b. Meta auth error is recorded with kind=auth", async () => {
    fetchMock.mockImplementationOnce(async () => metaError(401, 190, "Error validating access token"));
    const res = await post({ ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] });
    expect(res.status).toBe(502);
    const { orderRef } = await res.json();
    expect((await orders().findOne({ orderRef }))!.whatsappError).toMatchObject({ kind: "auth", code: 190 });
  });

  it("12. missing WhatsApp env vars: order saved as failed, Meta not called", async () => {
    const saved = process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    try {
      const res = await post({ ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] });
      const body = await res.json();
      expect(res.status).toBe(503);
      expect(body).toMatchObject({ success: false, error: "notification_failed" });
      expect(await orders().findOne({ orderRef: body.orderRef })).toMatchObject({
        status: "failed",
        whatsappError: { kind: "config" },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.WHATSAPP_ACCESS_TOKEN = saved;
    }
  });

  it("13. duplicate submissions (double click) create a single order and a single notification", async () => {
    const key = "key-double-click-0001";
    const payload = { ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] };
    const [a, b] = await Promise.all([post(payload, { key }), post(payload, { key })]);
    expect([a.status, b.status].sort()).toEqual(expect.arrayContaining([201]));
    expect(await orders().countDocuments()).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const again = await post(payload, { key });
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ success: true, duplicate: true });

    // Same order resubmitted without a key (e.g. page reload) within the window is also deduplicated.
    const noKey = await post(payload);
    expect((await noKey.json()).duplicate).toBe(true);
    expect(await orders().countDocuments()).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("14/15. success only when Meta returns a message id", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const res = await post({ ...customer, items: [{ productId: "nano-1k", quantity: 1 }] });
    expect(res.status).toBe(502);
    expect((await res.json()).success).toBe(false);
  });

  it("16. ignores client-supplied prices and totals (price manipulation)", async () => {
    const res = await post({
      ...customer,
      total: 1,
      price: 1,
      items: [
        { productId: "mazaya-80k", quantity: 2, price: 1, unitPrice: 1, subtotal: 1, productName: "Free" },
        { productId: "fakher-60k", quantity: 1, price: 0 },
      ],
    });
    const body = await res.json();
    const expected = 2 * price("mazaya-80k") + price("fakher-60k");
    expect(res.status).toBe(201);
    expect(body.total).toBe(expected);
    const doc = await orders().findOne({ orderRef: body.orderRef });
    expect(doc!.total).toBe(expected);
    expect(doc!.items[0]).toMatchObject({ productName: "Mazaya 80K", unitPrice: price("mazaya-80k"), subtotal: 2 * price("mazaya-80k") });
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).text.body).toContain(`${expected} DT`);
  });

  it("rate limits repeated requests from one IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await post({}, { ip: "203.0.113.7" })).status);
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("rejects cross-origin requests from unknown origins", async () => {
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example", "x-forwarded-for": "198.51.100.1" },
        body: JSON.stringify({ ...customer, items: [{ productId: "mazaya-80k", quantity: 1 }] }),
      }),
    );
    expect(res.status).toBe(403);
    expect(await orders().countDocuments()).toBe(0);
  });
});
