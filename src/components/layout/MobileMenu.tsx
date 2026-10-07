"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";
import { NAV_LINKS, SITE } from "@/lib/site";
import { isActivePath } from "./Header";
import { Logo } from "./Logo";
import styles from "./MobileMenu.module.css";

interface MobileMenuProps {
  pathname: string;
  cartCount: number;
  onClose: () => void;
}

export function MobileMenu({ pathname, cartCount, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const initialPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== initialPath.current) onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>("a, button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="mobile-menu"
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className={styles.top}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer le menu">
            <CloseIcon />
          </button>
          <Logo height={52} />
        </div>
        <nav aria-label="Navigation mobile">
          <ul className={styles.list}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.link}
                  aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                  onClick={onClose}
                >
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 && (
                    <span className={styles.count}>{cartCount}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.foot}>
          <Link href="/shop" className="btn btn-primary btn-block" onClick={onClose}>
            Voir les produits
          </Link>
          <p className={styles.note}>
            {SITE.tagline} · Réservé aux personnes majeures ({SITE.minimumAge}+)
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
