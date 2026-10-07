"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { CartIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { NAV_LINKS } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const { itemCount, ready } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = ready ? itemCount : 0;
  const cartLabel = count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier, vide";

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo height={46} priority />
        </div>

        <nav className={styles.nav} aria-label="Navigation principale">
          <ul className={styles.navList}>
            {NAV_LINKS.filter((l) => l.href !== "/cart").map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.navLink}
                  aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link href="/search" className={`${styles.iconButton} ${styles.mobileOnly}`} aria-label="Rechercher">
            <SearchIcon />
          </Link>
          <Link href="/cart" className={`${styles.iconButton} ${styles.mobileOnly}`} aria-label={cartLabel}>
            <CartIcon />
            {count > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <Link href="/cart" className={`btn btn-primary btn-sm ${styles.cartCta}`} aria-label={cartLabel}>
            <CartIcon size={18} />
            Panier
            <span className={styles.cartCtaCount} aria-hidden="true">
              {count > 99 ? "99+" : count}
            </span>
          </Link>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menuButton}`}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      {menuOpen && (
        <MobileMenu
          pathname={pathname}
          cartCount={count}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
