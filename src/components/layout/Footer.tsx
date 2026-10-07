import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./Footer.module.css";

export function Footer() {
  const { phone, email, address } = SITE.contact;
  const hasContact = Boolean(phone || email || address);

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Logo height={84} />
          <p className={styles.tagline}>{SITE.tagline}</p>
        </div>

        <nav aria-label="Liens du pied de page">
          <h2 className={styles.heading}>Navigation</h2>
          <ul className={styles.list}>
            {NAV_LINKS.filter((l) => l.href !== "/search").map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={styles.heading}>Contact</h2>
          {hasContact ? (
            <ul className={styles.list}>
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {address && <li className={styles.muted}>{address}</li>}
            </ul>
          ) : (
            <p className={styles.muted}>Nos coordonnées seront bientôt disponibles.</p>
          )}
        </div>
      </div>

      <div className={`container ${styles.legal}`}>
        <p className={styles.warning}>
          <span className={styles.ageBadge} aria-hidden="true">
            {SITE.minimumAge}+
          </span>
          <span>
            Vente réservée aux personnes majeures ({SITE.minimumAge} ans et plus). Les produits
            contenant de la nicotine créent une forte dépendance.
          </span>
        </p>
        <p>
          © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
