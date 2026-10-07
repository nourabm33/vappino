"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { AlertIcon, ArrowLeftIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";
import { readLastOrderError, type OrderFailure } from "@/lib/orders";
import styles from "./OrderSuccessView.module.css";

const GENERIC_TITLE = "Nous n'avons pas pu traiter votre commande.";
const GENERIC_DESCRIPTION =
  "Votre panier a été conservé et vos coordonnées sont pré-remplies. Vérifiez votre connexion internet puis réessayez dans quelques instants.";

function describe(failure: OrderFailure | null): { title: string; description: string } {
  switch (failure?.code) {
    case "notification_failed":
      return {
        title: "Commande enregistrée, confirmation en attente",
        description:
          failure.message ??
          "Votre commande a été enregistrée mais notre équipe n'a pas pu être prévenue. Réessayez dans quelques instants : elle ne sera pas dupliquée.",
      };
    case "rate_limited":
      return {
        title: "Trop de tentatives",
        description: failure.message ?? "Veuillez patienter quelques minutes avant de réessayer.",
      };
    case undefined:
    case "network":
    case "unknown":
      return { title: GENERIC_TITLE, description: GENERIC_DESCRIPTION };
    default:
      return {
        title: GENERIC_TITLE,
        description: failure?.message ? `${failure.message} Votre panier a été conservé.` : GENERIC_DESCRIPTION,
      };
  }
}

export function OrderErrorView() {
  const [failure, setFailure] = useState<OrderFailure | null>(null);

  useEffect(() => setFailure(readLastOrderError()), []);

  const { title, description } = describe(failure);

  return (
    <StatusCard
      tone="error"
      logo={<Logo height={72} />}
      icon={<AlertIcon size={30} />}
      title={title}
      description={description}
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
    >
      {failure?.orderRef ? (
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Référence</dt>
            <dd className={styles.reference}>{failure.orderRef}</dd>
          </div>
        </dl>
      ) : null}
    </StatusCard>
  );
}
