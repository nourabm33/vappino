import type { Currency } from "@/data/products";

const formatter = new Intl.NumberFormat("fr-TN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const SYMBOL: Record<Currency, string> = { TND: "DT" };

/** Formats an amount as "65 DT". */
export function formatPrice(amount: number, currency: Currency = "TND"): string {
  return `${formatter.format(amount)} ${SYMBOL[currency]}`;
}
