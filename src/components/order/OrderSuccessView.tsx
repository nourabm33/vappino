"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { Logo } from "@/components/layout/Logo";
import { CheckIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";
import { formatPrice } from "@/lib/format";
import { readLastOrder, type PlacedOrder } from "@/lib/orders";
import styles from "./OrderSuccessView.module.css";

/** Remembers which order already auto-opened WhatsApp, so coming back to this page doesn't reopen it. */
const OPENED_KEY = "vappino.whatsappOpened.v1";

function openWhatsAppOnce(order: PlacedOrder): void {
  try {
    if (sessionStorage.getItem(OPENED_KEY) === order.createdAt) return;
    sessionStorage.setItem(OPENED_KEY, order.createdAt);
  } catch {
    return;
  }
  window.location.assign(order.whatsappUrl);
}

export function OrderSuccessView() {
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);

  useEffect(() => {
    const last = readLastOrder();
    setOrder(last);
    if (last) openWhatsAppOnce(last);
  }, []);

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
      title="Votre commande est prête !"
      description="WhatsApp s'ouvre avec votre commande pré-remplie. Appuyez sur Envoyer dans WhatsApp pour nous la transmettre."
      actions={
        <>
          <a href={order.whatsappUrl} className="btn btn-primary" rel="noopener noreferrer">
            Ouvrir WhatsApp
          </a>
          <Link href="/shop" className="btn btn-secondary">
            Continuer mes achats
          </Link>
        </>
      }
    >
      <dl className={styles.details}>
        {order.reference ? (
          <div className={styles.row}>
            <dt>Référence</dt>
            <dd className={styles.reference}>{order.reference}</dd>
          </div>
        ) : null}
        <div className={styles.row}>
          <dt>Total</dt>
          <dd>{formatPrice(order.total, order.currency)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Date</dt>
          <dd>{date}</dd>
        </div>
      </dl>
      <p className={styles.note}>
        WhatsApp ne s&apos;est pas ouvert ? Appuyez sur « Ouvrir WhatsApp ». Votre commande n&apos;est transmise
        qu&apos;une fois le message envoyé.
      </p>
    </StatusCard>
  );
}
