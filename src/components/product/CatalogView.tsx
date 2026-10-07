"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/data/categories";
import { PRODUCTS } from "@/data/products";
import {
  SORT_OPTIONS,
  isSortOption,
  queryCatalog,
  type CategoryFilter,
  type SortOption,
} from "@/lib/catalog";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { ProductGrid } from "./ProductGrid";
import styles from "./CatalogView.module.css";

function isCategory(value: string | null): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}

interface CatalogViewProps {
  autoFocusSearch?: boolean;
  /** Hide the full catalog until the user has typed something. */
  requireQuery?: boolean;
}

export function CatalogView({ autoFocusSearch, requireQuery }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const initialCategory = params.get("category");
  const initialSort = params.get("sort");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<CategoryFilter>(
    isCategory(initialCategory) ? initialCategory : "all",
  );
  const [sort, setSort] = useState<SortOption>(isSortOption(initialSort) ? initialSort : "relevance");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (autoFocusSearch) inputRef.current?.focus();
  }, [autoFocusSearch]);

  // Keep the URL shareable without adding history entries on every keystroke.
  useEffect(() => {
    const next = new URLSearchParams();
    if (deferredQuery.trim()) next.set("q", deferredQuery.trim());
    if (category !== "all") next.set("category", category);
    if (sort !== "relevance") next.set("sort", sort);
    const qs = next.toString();
    if (qs !== params.toString()) {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, category, sort]);

  const searched = useMemo(() => queryCatalog(PRODUCTS, { query: deferredQuery }), [deferredQuery]);
  const results = useMemo(
    () => queryCatalog(PRODUCTS, { query: deferredQuery, category, sort }),
    [deferredQuery, category, sort],
  );

  const countFor = (id: CategoryFilter) =>
    id === "all" ? searched.length : searched.filter((p) => p.category === id).length;

  const hasQuery = deferredQuery.trim().length > 0;
  const showResults = !requireQuery || hasQuery || category !== "all";

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    inputRef.current?.focus();
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <form
          role="search"
          className={styles.searchWrap}
          onSubmit={(e) => {
            e.preventDefault();
            inputRef.current?.blur();
          }}
        >
          <label htmlFor="catalog-search" className="visually-hidden">
            Rechercher un produit
          </label>
          <SearchIcon size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            id="catalog-search"
            type="search"
            className={styles.search}
            placeholder="Rechercher : Vozol, 30ml, 60K…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className={styles.clear} onClick={resetFilters} aria-label="Effacer la recherche">
              <CloseIcon size={18} />
            </button>
          )}
        </form>

        <div className={styles.row}>
          <ul className={styles.chips} aria-label="Filtrer par catégorie">
            {[{ id: "all" as const, label: "Tous" }, ...CATEGORIES].map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                  <span className={styles.chipCount}>{countFor(c.id)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.row}>
          <p className={styles.count} role="status" aria-live="polite">
            {showResults
              ? `${results.length} produit${results.length > 1 ? "s" : ""}${hasQuery ? ` pour « ${deferredQuery.trim()} »` : ""}`
              : "Saisissez un nom ou une spécification."}
          </p>
          <label className={styles.sortWrap}>
            <span>Trier</span>
            <select
              className={styles.select}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {showResults &&
        (results.length > 0 ? (
          <ProductGrid products={results} priorityCount={4} />
        ) : (
          <div className={styles.empty}>
            <h2>Aucun produit trouvé</h2>
            <p>Essayez un autre nom, une spécification (ex. « 30ml », « 60K ») ou une autre catégorie.</p>
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              Réinitialiser la recherche
            </button>
          </div>
        ))}
    </div>
  );
}
