import type { Metadata } from "next";
import { OrderErrorView } from "@/components/order/OrderErrorView";

export const metadata: Metadata = { title: "Commande non envoyée", robots: { index: false } };

export default function OrderErrorPage() {
  return (
    <div className="container">
      <OrderErrorView />
    </div>
  );
}
