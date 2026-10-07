import { asset } from "./assets";

export const SITE = {
  name: "VAPPINO",
  tagline: "Vape Gros & Détail",
  description:
    "VAPPINO — Vape gros & détail. Puffs, kits, capsules et e-liquides. Commandez en ligne en quelques clics.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: {
    src: asset("/brand/vappino-logo.webp"),
    srcSmall: asset("/brand/vappino-logo-sm.webp"),
    width: 640,
    height: 493,
    alt: "VAPPINO — Vape Gros & Détail",
  },
  /** Fill in when available; the footer hides empty entries. */
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? "",
  },
  minimumAge: 18,
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/shop", label: "Boutique" },
  { href: "/search", label: "Recherche" },
  { href: "/cart", label: "Panier" },
] as const;
