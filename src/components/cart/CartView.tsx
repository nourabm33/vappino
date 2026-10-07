"use client";

import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from "@/components/ui/Icons";
import { useCart } from "./CartProvider";
import { CartLineItem } from "./CartLineItem";
import { EmptyCart } from "./EmptyCart";
import { OrderSummary } from "./OrderSummary";
import styles from "./CartView.module.css";

export function CartView() {
  const { ready, lines, itemCount, subtotal, clearCart } = useCart();

  if (!ready) return <div className={styles.skeleton} aria-busy="true" />;
  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className={styles.layout}>
      <section aria-labelledby="cart-items-title">
        <div className={styles.listHead}>
          <h2 id="cart-items-title" className="visually-hidden">
            Articles du panier
          </h2>
          <span>
            {itemCount} article{itemCount > 1 ? "s" : ""}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearCart}>
            <TrashIcon size={16} />
            Vider le panier
          </button>
        </div>
        <ul className={styles.list}>
          {lines.map((line) => (
            <CartLineItem key={line.product.id} line={line} />
          ))}
        </ul>
      </section>
      <div className={styles.aside}>
        <OrderSummary lines={lines} itemCount={itemCount} subtotal={subtotal}>
          <div className={styles.actions}>
            <Link href="/checkout" className="btn btn-primary btn-lg btn-block">
              Passer la commande
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/shop" className="btn btn-ghost btn-block">
              <ArrowLeftIcon size={18} />
              Continuer mes achats
            </Link>
          </div>
        </OrderSummary>
      </div>
    </div>
  );
}
