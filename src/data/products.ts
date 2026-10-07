import type { CategoryId } from "./categories";

export type Currency = "TND";

export interface Product {
  /** Stable identifier, also used in the URL (/product/[id]) and in orders. */
  id: string;
  name: string;
  /** Product specification (e.g. "80K", "30ml"). Never a price. */
  specification: string | null;
  /** Unit price in `currency` (TND). */
  price: number;
  currency: Currency;
  /** Path under /public, or null when no photo is available yet. */
  image: string | null;
  description: string;
  category: CategoryId;
  featured?: boolean;
  popular?: boolean;
}

const IMG = "/images/products";

export const PRODUCTS: readonly Product[] = [
  {
    id: "mazaya-80k",
    name: "Mazaya 80K",
    specification: "80K",
    price: 65,
    currency: "TND",
    image: null,
    description: "Mazaya 80K, spécification 80K.",
    category: "devices",
  },
  {
    id: "fakher-60k",
    name: "Fakher 60K",
    specification: "60K",
    price: 60,
    currency: "TND",
    image: `${IMG}/fakher-60k.webp`,
    description: "Crown Bar Al Fakher 60K, spécification 60K.",
    category: "devices",
    featured: true,
      },
  {
    id: "pava-pod",
    name: "Pava Pod",
    specification: null,
    price: 70,
    currency: "TND",
    image: null,
    description: "Pava Pod.",
    category: "other",
  },
  {
    id: "nexpod-30k-kit",
    name: "Nexpod 30K Kit",
    specification: "30K Kit",
    price: 50,
    currency: "TND",
    image: `${IMG}/nexpod-30k-kit.webp`,
    description: "Kit Wotofo nexPOD 30K, spécification 30K Kit.",
    category: "devices",
    featured: true,
  },
  {
    id: "nexpod-30k-capsule",
    name: "Nexpod 30K Capsule",
    specification: "30K Capsule",
    price: 40,
    currency: "TND",
    image: null,
    description: "Capsule Nexpod 30K, spécification 30K Capsule.",
    category: "capsules",
  },
  {
    id: "capsule-15k",
    name: "Capsule 15K",
    specification: "15K",
    price: 37,
    currency: "TND",
    image: null,
    description: "Capsule 15K, spécification 15K.",
    category: "capsules",
  },
  {
    id: "fakher-25k",
    name: "Fakher 25K",
    specification: "25K",
    price: 45,
    currency: "TND",
    image: `${IMG}/fakher-25k.webp`,
    description: "Crown Bar Al Fakher 25K, spécification 25K.",
    category: "devices",
    popular: true,
  },
  {
    id: "nexbar-10k",
    name: "Nexbar 10K",
    specification: "10K",
    price: 38,
    currency: "TND",
    image: null,
    description: "Nexbar 10K, spécification 10K.",
    category: "devices",
  },
  {
    id: "vozol-50k-click",
    name: "Vozol 50K Click",
    specification: "50K Click",
    price: 50,
    currency: "TND",
    image: `${IMG}/vozol-50k-click.webp`,
    description: "Vozol 50K Click, spécification 50K Click.",
    category: "devices",
    featured: true,
      },
  {
    id: "salt-wotofo-30ml",
    name: "Salt Wotofo 30ml",
    specification: "30ml",
    price: 30,
    currency: "TND",
    image: null,
    description: "E-liquide Salt Wotofo, flacon de 30ml.",
    category: "liquids",
  },
  {
    id: "salt-vozol-30ml",
    name: "Salt Vozol 30ml",
    specification: "30ml",
    price: 30,
    currency: "TND",
    image: null,
    description: "E-liquide Salt Vozol, flacon de 30ml.",
    category: "liquids",
  },
  {
    id: "capsule-nexpod-20k",
    name: "Capsule Nexpod 20K",
    specification: "20K",
    price: 38,
    currency: "TND",
    image: null,
    description: "Capsule Nexpod 20K, spécification 20K.",
    category: "capsules",
  },
  {
    id: "nexpod-20k",
    name: "Nexpod 20K",
    specification: "20K",
    price: 45,
    currency: "TND",
    image: null,
    description: "Nexpod 20K, spécification 20K.",
    category: "devices",
  },
  {
    id: "fakher-15k",
    name: "Fakher 15K",
    specification: "15K",
    price: 40,
    currency: "TND",
    image: `${IMG}/fakher-15k.webp`,
    description: "Crown Bar Al Fakher Hypermax 15K, spécification 15K.",
    category: "devices",
    popular: true,
  },
  {
    id: "salt-10ml-jnr",
    name: "Salt 10ml JNR",
    specification: "10ml",
    price: 15,
    currency: "TND",
    image: null,
    description: "E-liquide Salt JNR, flacon de 10ml.",
    category: "liquids",
  },
  {
    id: "mech-pava",
    name: "Mech Pava",
    specification: null,
    price: 18,
    currency: "TND",
    image: null,
    description: "Mech Pava.",
    category: "other",
  },
  {
    id: "elfbar-30k-shisha",
    name: "Elfbar 30K Shisha",
    specification: "30K Shisha",
    price: 40,
    currency: "TND",
    image: null,
    description: "Elfbar 30K Shisha, spécification 30K Shisha.",
    category: "devices",
  },
  {
    id: "capsule-5k",
    name: "Capsule 5K",
    specification: "5K",
    price: 20,
    currency: "TND",
    image: null,
    description: "Capsule 5K, spécification 5K.",
    category: "capsules",
  },
  {
    id: "snus",
    name: "Snus",
    specification: null,
    price: 18,
    currency: "TND",
    image: null,
    description: "Snus.",
    category: "other",
  },
  {
    id: "jnr-40k",
    name: "JNR 40K",
    specification: "40K",
    price: 48,
    currency: "TND",
    image: null,
    description: "JNR 40K, spécification 40K.",
    category: "devices",
  },
  {
    id: "jnr-60k",
    name: "JNR 60K",
    specification: "60K",
    price: 55,
    currency: "TND",
    image: null,
    description: "JNR 60K, spécification 60K.",
    category: "devices",
  },
  {
    id: "jnr-42k",
    name: "JNR 42K",
    specification: "42K",
    price: 50,
    currency: "TND",
    image: null,
    description: "JNR 42K, spécification 42K.",
    category: "devices",
  },
  {
    id: "dragbar-s2-12k",
    name: "Dragbar S2 12K",
    specification: "12K",
    price: 35,
    currency: "TND",
    image: `${IMG}/dragbar-s2-12k.webp`,
    description: "Dragbar S2 Pod System, spécification 12K.",
    category: "devices",
    featured: true,
  },
  {
    id: "vozol-8k",
    name: "Vozol 8K",
    specification: "8K",
    price: 30,
    currency: "TND",
    image: `${IMG}/vozol-8k.webp`,
    description: "Vozol Star 8000, spécification 8K.",
    category: "devices",
    popular: true,
  },
  {
    id: "nano-1k",
    name: "Nano 1K",
    specification: "1K",
    price: 23,
    currency: "TND",
    image: `${IMG}/nano-1k.webp`,
    description: "Wotofo Nano, spécification 1K.",
    category: "devices",
    popular: true,
  },
  {
    id: "fighter-fuel-32k-2-salt",
    name: "Fighter Fuel 32K + 2 Salt",
    specification: "32K + 2 Salt",
    price: 45,
    currency: "TND",
    image: null,
    description: "Pack Fighter Fuel 32K + 2 Salt.",
    category: "other",
  },
  {
    id: "salt-wotofo-15ml",
    name: "Salt Wotofo 15ml",
    specification: "15ml",
    price: 20,
    currency: "TND",
    image: null,
    description: "E-liquide Salt Wotofo, flacon de 15ml.",
    category: "liquids",
  },
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProductById(id: string): Product | undefined {
  return BY_ID.get(id);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}

export function getPopularProducts(): Product[] {
  return PRODUCTS.filter((p) => p.popular);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, limit);
}
