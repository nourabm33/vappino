import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/server/errors";

export const ADMIN_USERNAME = "vappino.2027";
export const SESSION_COOKIE = "vappino_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MIN_PASSWORD_LENGTH = 12;

interface AdminConfig {
  password: string;
  sessionSecret: string;
}

/** Returns null when the admin area is not configured (ADMIN_PASSWORD missing or too short). */
export function readAdminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig | null {
  const password = env.ADMIN_PASSWORD ?? "";
  if (password.length < MIN_PASSWORD_LENGTH) return null;
  const sessionSecret =
    env.ADMIN_SESSION_SECRET?.trim() ||
    createHmac("sha256", password).update("vappino-admin-session-v1").digest("hex");
  return { password, sessionSecret };
}

export function requireAdminConfig(): AdminConfig {
  const config = readAdminConfig();
  if (!config) {
    throw new ApiError(503, "admin_disabled", "L'espace admin n'est pas configuré (ADMIN_PASSWORD manquant).");
  }
  return config;
}

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function checkCredentials(username: unknown, password: unknown, config: AdminConfig): boolean {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const userOk = safeEqual(username.trim(), ADMIN_USERNAME);
  const passOk = safeEqual(password, config.password);
  return userOk && passOk;
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function createSessionToken(config: AdminConfig, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: ADMIN_USERNAME, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload, config.sessionSecret)}`;
}

export function verifySessionToken(token: string | undefined, config: AdminConfig, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;
  if (!safeEqual(signature, sign(payload, config.sessionSecret))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: unknown; exp?: unknown };
    return data.sub === ADMIN_USERNAME && typeof data.exp === "number" && data.exp * 1000 > now;
  } catch {
    return false;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

export function sessionCookie(req: Request, value: string, maxAge: number): string {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Rejects cross-site requests; admin endpoints are only called from the same origin. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin === new URL(req.url).origin || (host && (origin === `https://${host}` || origin === `http://${host}`))) {
    return;
  }
  throw new ApiError(403, "forbidden_origin", "Origine non autorisée.");
}

export function requireAdmin(req: Request): void {
  const config = requireAdminConfig();
  assertSameOrigin(req);
  if (!verifySessionToken(readCookie(req, SESSION_COOKIE), config)) {
    throw new ApiError(401, "unauthorized", "Session expirée. Veuillez vous reconnecter.");
  }
}
