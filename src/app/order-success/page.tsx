import type { Metadata } from "next";
import { OrderSuccessView } from "@/components/order/OrderSuccessView";

export const metadata: Metadata = { title: "Commande reçue", robots: { index: false } };

export default function OrderSuccessPage() {
  return (
    <div className="container">
      <OrderSuccessView />
    </div>
  );
}
