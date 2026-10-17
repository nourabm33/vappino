"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BASE_PATH } from "@/lib/assets";
import { dayLabel, formatDate, money, periodLabel, statusLabel, tunisDayKey } from "@/lib/admin/format";
import type { DashboardResponse, WeeklyReportResponse } from "@/lib/admin/types";
import styles from "./AdminApp.module.css";

const API = `${BASE_PATH}/api/admin`;
const DAY_MS = 86_400_000;

type View = "loading" | "login" | "ready" | "disabled";

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new HttpError(res.status, body.message ?? "Erreur inattendue.");
  return body as T;
}

const shiftDays = (key: string, days: number) => tunisDayKey(new Date(Date.parse(`${key}T12:00:00Z`) + days * DAY_MS));

function quickRanges(period: DashboardResponse["period"]) {
  const today = tunisDayKey(new Date());
  return [
    { label: "Aujourd'hui", from: today, to: today },
    { label: "Semaine en cours", from: period.key, to: today },
    { label: "7 derniers jours", from: shiftDays(today, -6), to: today },
    { label: "30 derniers jours", from: shiftDays(today, -29), to: today },
  ];
}

export function AdminApp({ staticHost, adminUrl }: { staticHost: boolean; adminUrl: string }) {
  const [view, setView] = useState<View>("loading");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (r: { from: string; to: string } | null) => {
    setError(null);
    try {
      const query = r ? `?from=${r.from}&to=${r.to}` : "";
      const res = await api<DashboardResponse>(`/dashboard${query}`);
      setData(res);
      setRange(res.range);
      setView("ready");
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) setView("login");
      else if (e instanceof HttpError && e.status === 503 && /admin/i.test(e.message)) setView("disabled");
      else {
        setError(e instanceof Error ? e.message : "Erreur inattendue.");
        setView((v) => (v === "loading" ? "login" : v));
      }
    }
  }, []);

  useEffect(() => {
    if (!staticHost) void load(null);
  }, [load, staticHost]);

  if (staticHost) {
    return (
      <section className={`container ${styles.page}`}>
        <div className={styles.card}>
          <h1 className={styles.title}>Espace admin</h1>
          <p className={styles.muted}>Le tableau de bord est disponible sur le serveur sécurisé :</p>
          <a className="btn btn-primary" href={adminUrl}>
            Ouvrir l&apos;espace admin
          </a>
        </div>
      </section>
    );
  }

  if (view === "loading") return <section className={`container ${styles.page}`} aria-busy="true" />;
  if (view === "disabled") {
    return (
      <section className={`container ${styles.page}`}>
        <div className={styles.card}>
          <h1 className={styles.title}>Espace admin désactivé</h1>
          <p className={styles.muted}>Définissez ADMIN_PASSWORD (12 caractères minimum) dans les variables d&apos;environnement Vercel.</p>
        </div>
      </section>
    );
  }
  if (view === "login" || !data || !range) return <LoginForm error={error} onSuccess={() => load(null)} />;

  const exportPdf = async (kind: "orders" | "daily" | "weekly" | "profit" | `archive:${string}`) => {
    setBusy(kind);
    setError(null);
    try {
      const pdf = await import("@/lib/admin/pdf");
      const label = `${dayLabel(data.range.from)} - ${dayLabel(data.range.to)}`;
      const suffix = `${data.range.from}_${data.range.to}`;
      if (kind === "orders") pdf.ordersPdf(data.orders, label).save(`vappino-commandes-${suffix}.pdf`);
      else if (kind === "daily") pdf.dailyStatsPdf(data.stats, label).save(`vappino-stats-journalieres-${suffix}.pdf`);
      else if (kind === "profit") {
        const name = data.stats.profit === null ? "revenu" : "benefice";
        pdf.profitPdf(data.stats, label).save(`vappino-rapport-${name}-${suffix}.pdf`);
      } else {
        const week = kind === "weekly" ? "" : `?week=${kind.slice("archive:".length)}`;
        const report = await api<WeeklyReportResponse>(`/reports${week}`);
        pdf.weeklyReportPdf(report).save(`vappino-rapport-hebdo-${report.period.key}.pdf`);
      }
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) setView("login");
      setError(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    setData(null);
    setView("login");
  };

  const { stats, period } = data;
  const maxDaily = Math.max(1, ...stats.daily.map((d) => d.revenue));
  const resetAt = formatDate(period.end, true);

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.top}>
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className={styles.title}>Tableau de bord</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Déconnexion
        </button>
      </header>

      <p className={styles.notice}>
        Semaine en cours : <strong>{periodLabel(period)}</strong>. Le tableau de bord passe à une nouvelle semaine le{" "}
        <strong>{resetAt}</strong> (heure de Tunis). Rien n&apos;est supprimé : les semaines clôturées sont archivées
        ci-dessous et restent téléchargeables en PDF.
      </p>

      <form
        className={styles.filters}
        onSubmit={(e) => {
          e.preventDefault();
          void load(range);
        }}
      >
        <label>
          Du
          <input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} required />
        </label>
        <label>
          Au
          <input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} required />
        </label>
        <button type="submit" className="btn btn-primary">
          Filtrer
        </button>
        <div className={styles.quick}>
          {quickRanges(period).map((q) => (
            <button
              key={q.label}
              type="button"
              className={`${styles.chip} ${data.range.from === q.from && data.range.to === q.to ? styles.chipActive : ""}`}
              onClick={() => void load({ from: q.from, to: q.to })}
            >
              {q.label}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.cards}>
        <Card label="Commandes" value={String(stats.orderCount)} />
        <Card label="Chiffre d'affaires (revenu)" value={money(stats.revenue)} />
        <Card label="Panier moyen" value={money(stats.averageOrder)} />
        <Card label="Articles vendus" value={String(stats.itemsSold)} />
        {stats.profit !== null ? (
          <Card label="Bénéfice" value={money(stats.profit)} accent />
        ) : (
          <Card
            label="Bénéfice"
            value="Non disponible"
            hint={stats.costsConfigured ? `Coût manquant : ${stats.missingCosts.join(", ")}` : "Coûts produits non configurés — montants = revenu"}
          />
        )}
      </div>

      <div className={styles.exports}>
        <h2 className={styles.h2}>Exports PDF</h2>
        <div className={styles.exportButtons}>
          {(
            [
              ["orders", "Commandes"],
              ["daily", "Statistiques journalières"],
              ["weekly", "Rapport hebdomadaire"],
              ["profit", stats.profit === null ? "Rapport de revenu" : "Rapport de bénéfice"],
            ] as const
          ).map(([kind, label]) => (
            <button key={kind} type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void exportPdf(kind)}>
              {busy === kind ? "Préparation…" : `PDF · ${label}`}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.h2}>Par jour</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Commandes</th>
                <th>Revenu</th>
              </tr>
            </thead>
            <tbody>
              {stats.daily.map((d) => (
                <tr key={d.date}>
                  <td>{dayLabel(d.date)}</td>
                  <td>{d.orderCount}</td>
                  <td>
                    <span className={styles.bar} style={{ width: `${(d.revenue / maxDaily) * 100}%` }} aria-hidden="true" />
                    {money(d.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.weekly.length > 1 && (
            <>
              <h3 className={styles.h3}>Par semaine</h3>
              <table className={styles.table}>
                <tbody>
                  {stats.weekly.map((w) => (
                    <tr key={w.periodKey}>
                      <td>{periodLabel({ start: w.periodStart, end: w.periodEnd })}</td>
                      <td>{w.orderCount} cmd.</td>
                      <td>{money(w.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.h2}>Meilleures ventes</h2>
          {stats.topProducts.length === 0 ? (
            <p className={styles.muted}>Aucune vente sur cette période.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Revenu</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.slice(0, 10).map((p) => (
                  <tr key={p.productId}>
                    <td>{p.productName}</td>
                    <td>{p.quantity}</td>
                    <td>{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.h2}>Commandes ({data.orders.length})</h2>
        {data.orders.length === 0 ? (
          <p className={styles.muted}>Aucune commande sur cette période.</p>
        ) : (
          <table className={`${styles.table} ${styles.orders}`}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Référence</th>
                <th>Client</th>
                <th>Articles</th>
                <th>Total</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.orderRef}>
                  <td data-label="Date">{formatDate(o.createdAt, true)}</td>
                  <td data-label="Référence" className={styles.mono}>
                    {o.orderRef}
                  </td>
                  <td data-label="Client">{o.customerName}</td>
                  <td data-label="Articles">
                    {o.items.map((i) => (
                      <div key={i.productId}>
                        {i.quantity} × {i.productName}
                      </div>
                    ))}
                  </td>
                  <td data-label="Total">{money(o.total)}</td>
                  <td data-label="Statut">
                    <span className={`${styles.status} ${o.status === "cancelled" ? styles.statusOff : ""}`}>{statusLabel(o.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.panel}>
        <h2 className={styles.h2}>Semaines archivées</h2>
        {data.archives.length === 0 ? (
          <p className={styles.muted}>Aucune semaine clôturée pour le moment.</p>
        ) : (
          <ul className={styles.archives}>
            {data.archives.map((a) => (
              <li key={a.key}>
                <span>
                  <strong>{periodLabel({ start: a.periodStart, end: a.periodEnd })}</strong>
                  <span className={styles.muted}>
                    {" "}
                    · {a.orderCount} commande(s) · {money(a.revenue)}
                  </span>
                </span>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void exportPdf(`archive:${a.key}`)}>
                  {busy === `archive:${a.key}` ? "Préparation…" : "PDF"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Card({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`${styles.stat} ${accent ? styles.statAccent : ""}`}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  );
}

function LoginForm({ error, onSuccess }: { error: string | null; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(error);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await api("/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setPassword("");
      onSuccess();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={`container ${styles.page}`}>
      <form className={`${styles.card} ${styles.login}`} onSubmit={submit}>
        <span className="eyebrow">Admin</span>
        <h1 className={styles.title}>Connexion</h1>
        <label className={styles.field}>
          Identifiant
          <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Mot de passe
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {message && (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </section>
  );
}
