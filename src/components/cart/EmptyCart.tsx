import Link from "next/link";
import { CartIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";

export function EmptyCart({ title = "Votre panier est vide" }: { title?: string }) {
  return (
    <StatusCard
      tone="neutral"
      icon={<CartIcon size={28} />}
      title={title}
      description="Parcourez la boutique et ajoutez vos produits préférés."
      actions={
        <Link href="/shop" className="btn btn-primary">
          Voir les produits
        </Link>
      }
    />
  );
}
