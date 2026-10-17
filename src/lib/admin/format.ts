import type { PeriodInfo } from "./types";

export const ADMIN_TZ = "Africa/Tunis";
const OFFSET_MS = 60 * 60 * 1000;

/** Plain-ASCII amount (PDF standard fonts cannot draw the narrow spaces Intl uses for fr). */
export const money = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 3 }).replace(/,/g, " ")} DT`;

export const formatDate = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADMIN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));

export const dayLabel = (key: string) => key.split("-").reverse().join("/");

/** YYYY-MM-DD in Tunis time (UTC+1, no DST). */
export const tunisDayKey = (date: Date) => new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** Inclusive label for an exclusive [start, end) period. */
export const periodLabel = (p: Pick<PeriodInfo, "start" | "end">) =>
  `${formatDate(p.start)} - ${formatDate(new Date(Date.parse(p.end) - 1).toISOString())}`;

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  received: "Reçue",
  notification_sent: "Notifiée",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  failed: "Échec notification",
};
export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
