import type { CategoryId } from "@/data/categories";
import type { Product } from "@/data/products";

export type SortOption = "relevance" | "price-asc" | "price-desc" | "name-asc";

export const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "name-asc", label: "Nom (A → Z)" },
];

export type CategoryFilter = CategoryId | "all";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches every whitespace-separated term against name + specification. */
export function matchesQuery(product: Product, query: string): boolean {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(`${product.name} ${product.specification ?? ""}`);
  const compact = haystack.replace(/\s/g, "");
  return terms.every((t) => haystack.includes(t) || compact.includes(t));
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default:
      return sorted;
  }
}

export interface CatalogQuery {
  query?: string;
  category?: CategoryFilter;
  sort?: SortOption;
}

export function queryCatalog(
  products: readonly Product[],
  { query = "", category = "all", sort = "relevance" }: CatalogQuery,
): Product[] {
  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category === category) && matchesQuery(p, query),
  );
  return sortProducts(filtered, sort);
}

export function isSortOption(value: string | null | undefined): value is SortOption {
  return SORT_OPTIONS.some((o) => o.value === value);
}
