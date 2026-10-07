import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { AlertIcon, ArrowLeftIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";

export const metadata: Metadata = { title: "Commande non envoyée", robots: { index: false } };

export default function OrderErrorPage() {
  return (
    <div className="container">
      <StatusCard
        tone="error"
        logo={<Logo height={72} />}
        icon={<AlertIcon size={30} />}
        title="Nous n'avons pas pu traiter votre commande."
        description="Votre panier a été conservé et vos coordonnées sont pré-remplies. Vérifiez votre connexion internet puis réessayez dans quelques instants."
        actions={
          <>
            <Link href="/checkout" className="btn btn-primary">
              Réessayer
            </Link>
            <Link href="/cart" className="btn btn-secondary">
              <ArrowLeftIcon size={18} />
              Retour au panier
            </Link>
          </>
        }
      />
    </div>
  );
}
