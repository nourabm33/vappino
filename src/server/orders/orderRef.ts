import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ORDER_REF_PATTERN = /^VAP-\d{8}-[A-HJ-NP-Z2-9]{4}$/;

/** VAP-YYYYMMDD-XXXX, dated in Tunisia's time zone. Uniqueness is enforced by a DB index. */
export function generateOrderRef(date = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `VAP-${ymd}-${suffix}`;
}
