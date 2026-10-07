import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container">
      <PageHeader
        eyebrow="Commande"
        title="Finaliser la commande"
        description="Indiquez votre nom et votre numéro de téléphone pour envoyer votre commande."
      />
      <CheckoutView />
    </div>
  );
}
