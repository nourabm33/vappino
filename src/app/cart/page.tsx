import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <div className="container">
      <PageHeader eyebrow="Panier" title="Votre panier" />
      <CartView />
    </div>
  );
}
