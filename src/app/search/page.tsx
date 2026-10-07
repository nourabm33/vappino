import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/product/CatalogView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Recherche",
  description: "Recherchez un produit VAPPINO par nom ou spécification.",
};

export default function SearchPage() {
  return (
    <div className="container">
      <PageHeader
        eyebrow="Recherche"
        title="Rechercher un produit"
        description="Par nom (ex. « Vozol ») ou par spécification (ex. « 30ml », « 60K »)."
      />
      <Suspense>
        <CatalogView autoFocusSearch requireQuery />
      </Suspense>
    </div>
  );
}
