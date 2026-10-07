"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { Logo } from "@/components/layout/Logo";
import { CheckIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";
import { formatPrice } from "@/lib/format";
import { readLastOrder, type ConfirmedOrder } from "@/lib/orders";
import styles from "./OrderSuccessView.module.css";

export function OrderSuccessView() {
  const [order, setOrder] = useState<ConfirmedOrder | null | undefined>(undefined);

  useEffect(() => setOrder(readLastOrder()), []);

  if (order === undefined) return null;
  if (order === null) return <EmptyCart title="Aucune commande récente" />;

  const date = new Date(order.createdAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <StatusCard
      tone="success"
      logo={<Logo height={72} />}
      icon={<CheckIcon size={30} />}
      title="Commande reçue !"
      description="Votre commande a bien été enregistrée. Nous vous contacterons par téléphone pour la confirmer."
      actions={
        <>
          <Link href="/shop" className="btn btn-primary">
            Continuer mes achats
          </Link>
          <Link href="/" className="btn btn-secondary">
            Retour à l&apos;accueil
          </Link>
        </>
      }
    >
      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>Référence</dt>
          <dd className={styles.reference}>{order.reference}</dd>
        </div>
        <div className={styles.row}>
          <dt>Total</dt>
          <dd>{formatPrice(order.total, order.currency)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Date</dt>
          <dd>{date}</dd>
        </div>
      </dl>
      <p className={styles.note}>Conservez votre référence de commande pour tout échange avec nous.</p>
    </StatusCard>
  );
}
