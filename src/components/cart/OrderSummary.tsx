import type { ReactNode } from "react";
import type { CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/product/ProductImage";
import styles from "./OrderSummary.module.css";

interface OrderSummaryProps {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  showItems?: boolean;
  children?: ReactNode;
}

export function OrderSummary({ lines, itemCount, subtotal, showItems, children }: OrderSummaryProps) {
  return (
    <section className={styles.root} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.title}>
        Récapitulatif
      </h2>
      {showItems && (
        <ul className={styles.items}>
          {lines.map(({ product, quantity, lineTotal }) => (
            <li key={product.id} className={styles.item}>
              <ProductImage product={product} sizes="52px" className={styles.thumb} />
              <div>
                <p className={styles.itemName}>{product.name}</p>
                <p className={styles.itemMeta}>
                  {product.specification ? `${product.specification} · ` : ""}
                  {quantity} × {formatPrice(product.price, product.currency)}
                </p>
              </div>
              <span className={styles.itemTotal}>{formatPrice(lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Articles</dt>
          <dd>{itemCount}</dd>
        </div>
        <div className={styles.row}>
          <dt>Sous-total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <dt>Total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      <p className={styles.note}>Aucun paiement en ligne. Le montant final vous sera confirmé lors du traitement de votre commande.</p>
      {children}
    </section>
  );
}
