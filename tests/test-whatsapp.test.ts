import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/test-whatsapp/route";
import { META_OK_ID, WA_ENV, metaError, stubMetaFetch } from "./helpers";

let ip = 0;
const call = (auth?: string) =>
  POST(
    new Request("http://localhost/api/test-whatsapp", {
      method: "POST",
      headers: { "x-forwarded-for": `172.16.0.${++ip}`, ...(auth ? { authorization: auth } : {}) },
    }),
  );

let fetchMock: ReturnType<typeof stubMetaFetch>;
beforeEach(() => {
  Object.assign(process.env, WA_ENV, { ADMIN_API_KEY: "admin-key-for-tests-123456" });
  fetchMock = stubMetaFetch();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/test-whatsapp", () => {
  it("is disabled when ADMIN_API_KEY is not set", async () => {
    delete process.env.ADMIN_API_KEY;
    expect((await call("Bearer x")).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong admin keys", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing WhatsApp configuration", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const res = await call("Bearer admin-key-for-tests-123456");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "whatsapp_config_missing", missing: ["WHATSAPP_ACCESS_TOKEN"] });
  });

  it("succeeds only when Meta accepts the message", async () => {
    const res = await call("Bearer admin-key-for-tests-123456");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, messageId: META_OK_ID, mode: "text" });
    expect(JSON.stringify(body)).not.toContain(WA_ENV.WHATSAPP_ACCESS_TOKEN);
  });

  it("surfaces Meta errors", async () => {
    fetchMock.mockImplementationOnce(async () => metaError(401, 190, "Error validating access token"));
    const res = await call("Bearer admin-key-for-tests-123456");
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ success: false, error: "whatsapp_auth", metaCode: 190 });
  });

  it("rate limits per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (await POST(new Request("http://localhost/api/test-whatsapp", { method: "POST", headers: { "x-forwarded-for": "192.0.2.99" } }))).status,
      );
    }
    expect(statuses[5]).toBe(429);
  });
});
