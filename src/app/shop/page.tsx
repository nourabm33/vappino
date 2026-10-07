import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/product/CatalogView";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRODUCTS } from "@/data/products";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Tous les produits VAPPINO : puffs, kits, capsules et e-liquides, prix en DT.",
};

export default function ShopPage() {
  return (
    <div className="container">
      <PageHeader
        eyebrow="Boutique"
        title="Tous les produits"
        description={`${PRODUCTS.length} références. Filtrez par catégorie ou recherchez par nom et spécification.`}
      />
      <Suspense>
        <CatalogView />
      </Suspense>
    </div>
  );
}
