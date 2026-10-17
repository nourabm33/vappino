import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminOrder, PeriodInfo, Stats } from "./types";

/** PDF builders for the admin exports. Standard PDF fonts only cover Latin-1, so text is kept plain. */

import { dayLabel, formatDate, money, periodLabel, statusLabel } from "./format";

const clean = (s: string) => s.replace(/[^\x20-\xFF]/g, "-");

interface Ctx {
  title: string;
  subtitle: string;
}

function startDoc({ title, subtitle }: Ctx): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(clean(`VAPPINO - ${title}`), 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(clean(subtitle), 40, 68);
  doc.text(clean(`Généré le ${formatDate(new Date().toISOString(), true)} (heure de Tunis)`), 40, 82);
  doc.setTextColor(0);
  return doc;
}

const lastY = (doc: jsPDF) => (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

function table(doc: jsPDF, head: string[], body: (string | number)[][], startY?: number) {
  autoTable(doc, {
    head: [head.map(clean)],
    body: body.map((row) => row.map((c) => clean(String(c)))),
    startY: startY ?? lastY(doc) + 18,
    margin: { left: 40, right: 40 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [23, 20, 58], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 243, 252] },
  });
}

function heading(doc: jsPDF, text: string) {
  const y = lastY(doc) + 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(clean(text), 40, y);
  doc.setFont("helvetica", "normal");
  (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable = { finalY: y - 8 };
}

function summary(doc: jsPDF, stats: Stats, startY = 100) {
  table(
    doc,
    ["Indicateur", "Valeur"],
    [
      ["Commandes", stats.orderCount],
      ["Chiffre d'affaires (revenu, hors commandes annulées)", money(stats.revenue)],
      ["Panier moyen", money(stats.averageOrder)],
      ["Articles vendus", stats.itemsSold],
      ["Bénéfice", stats.profit === null ? "Non disponible (coûts produits non configurés)" : money(stats.profit)],
    ],
    startY,
  );
}

const itemsText = (o: AdminOrder) => o.items.map((i) => `${i.quantity} x ${i.productName}`).join("\n");

export function ordersPdf(orders: AdminOrder[], rangeLabel: string): jsPDF {
  const doc = startDoc({ title: "Commandes", subtitle: `Période : ${rangeLabel} - ${orders.length} commande(s)` });
  table(
    doc,
    ["Date", "Référence", "Client", "Articles", "Total", "Statut"],
    orders.map((o) => [formatDate(o.createdAt, true), o.orderRef, o.customerName, itemsText(o), money(o.total), statusLabel(o.status)]),
    100,
  );
  return doc;
}

export function dailyStatsPdf(stats: Stats, rangeLabel: string): jsPDF {
  const doc = startDoc({ title: "Statistiques journalières", subtitle: `Période : ${rangeLabel}` });
  summary(doc, stats);
  heading(doc, "Par jour");
  table(
    doc,
    ["Jour", "Commandes", "Chiffre d'affaires", ...(stats.profit !== null ? ["Bénéfice"] : [])],
    stats.daily.map((d) => [dayLabel(d.date), d.orderCount, money(d.revenue), ...(stats.profit !== null ? [money(d.profit ?? 0)] : [])]),
  );
  heading(doc, "Produits les plus vendus");
  table(
    doc,
    ["Produit", "Quantité", "Chiffre d'affaires"],
    stats.topProducts.map((p) => [p.productName, p.quantity, money(p.revenue)]),
  );
  return doc;
}

export function weeklyReportPdf(report: { period: PeriodInfo; status: "open" | "archived"; stats: Stats; orders: AdminOrder[] }): jsPDF {
  const doc = startDoc({
    title: "Rapport hebdomadaire",
    subtitle: `Semaine du ${periodLabel(report.period)} - ${report.status === "archived" ? "clôturée (archivée)" : "en cours"}`,
  });
  summary(doc, report.stats);
  heading(doc, "Par jour");
  table(
    doc,
    ["Jour", "Commandes", "Chiffre d'affaires"],
    report.stats.daily.map((d) => [dayLabel(d.date), d.orderCount, money(d.revenue)]),
  );
  heading(doc, "Produits les plus vendus");
  table(doc, ["Produit", "Quantité", "Chiffre d'affaires"], report.stats.topProducts.map((p) => [p.productName, p.quantity, money(p.revenue)]));
  heading(doc, "Commandes");
  table(
    doc,
    ["Date", "Référence", "Client", "Articles", "Total", "Statut"],
    report.orders.map((o) => [formatDate(o.createdAt, true), o.orderRef, o.customerName, itemsText(o), money(o.total), statusLabel(o.status)]),
  );
  return doc;
}

export function profitPdf(stats: Stats, rangeLabel: string): jsPDF {
  const hasProfit = stats.profit !== null;
  const doc = startDoc({
    title: hasProfit ? "Rapport de bénéfice" : "Rapport de revenu",
    subtitle: `Période : ${rangeLabel}`,
  });
  if (!hasProfit) {
    doc.setFontSize(10);
    doc.text(
      clean(
        stats.costsConfigured
          ? `Bénéfice non calculé : coût manquant pour ${stats.missingCosts.join(", ")}. Montants = revenu.`
          : "Bénéfice non calculé : aucun coût produit configuré (ADMIN_PRODUCT_COSTS). Montants = revenu.",
      ),
      40,
      100,
      { maxWidth: 515 },
    );
  }
  summary(doc, stats, 120);
  heading(doc, "Par produit");
  table(
    doc,
    hasProfit ? ["Produit", "Quantité", "Revenu", "Coût", "Bénéfice"] : ["Produit", "Quantité", "Revenu"],
    stats.topProducts.map((p) =>
      hasProfit
        ? [p.productName, p.quantity, money(p.revenue), money(p.revenue - (p.profit ?? 0)), money(p.profit ?? 0)]
        : [p.productName, p.quantity, money(p.revenue)],
    ),
  );
  heading(doc, "Par semaine");
  table(
    doc,
    hasProfit ? ["Semaine", "Commandes", "Revenu", "Bénéfice"] : ["Semaine", "Commandes", "Revenu"],
    stats.weekly.map((w) => [
      periodLabel({ start: w.periodStart, end: w.periodEnd }),
      w.orderCount,
      money(w.revenue),
      ...(hasProfit ? [money(w.profit ?? 0)] : []),
    ]),
  );
  return doc;
}
