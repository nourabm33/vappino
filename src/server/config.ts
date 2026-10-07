export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  /** Digits only, international format without "+" (e.g. 21651144339). */
  ownerNumber: string;
  apiVersion: string;
  /** When set, notifications use this approved template instead of free-form text. */
  templateName: string | null;
  templateLanguage: string;
}

const REQUIRED_WHATSAPP_ENV = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "OWNER_WHATSAPP_NUMBER",
] as const;

export function readWhatsAppConfig(env: NodeJS.ProcessEnv = process.env): {
  config: WhatsAppConfig | null;
  missing: string[];
} {
  const read = (key: string) => env[key]?.trim() ?? "";
  const missing: string[] = REQUIRED_WHATSAPP_ENV.filter((key) => !read(key));
  if (missing.length > 0) return { config: null, missing };
  return {
    config: {
      accessToken: read("WHATSAPP_ACCESS_TOKEN"),
      phoneNumberId: read("WHATSAPP_PHONE_NUMBER_ID"),
      ownerNumber: read("OWNER_WHATSAPP_NUMBER").replace(/\D/g, ""),
      apiVersion: read("WHATSAPP_API_VERSION") || "v21.0",
      templateName: read("WHATSAPP_TEMPLATE_NAME") || null,
      templateLanguage: read("WHATSAPP_TEMPLATE_LANGUAGE") || "fr",
    },
    missing: [],
  };
}

/** Extra origins allowed to call the API cross-origin (e.g. a separately hosted frontend). */
export function readAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
