"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { AddToCartButton } from "./AddToCartButton";
import styles from "./ProductPurchase.module.css";

export function ProductPurchase({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label} id="qty-label">
          Quantité
        </span>
        <QuantitySelector
          value={quantity}
          onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
          onIncrement={() => setQuantity((q) => Math.min(MAX_QUANTITY_PER_LINE, q + 1))}
          max={MAX_QUANTITY_PER_LINE}
          label={`Quantité pour ${product.name}`}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Total</span>
        <span className={styles.total} aria-live="polite">
          {quantity} × {formatPrice(product.price, product.currency)} ={" "}
          <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
        </span>
      </div>
      <AddToCartButton
        productId={product.id}
        productName={product.name}
        quantity={quantity}
        label={quantity > 1 ? `Ajouter ${quantity} articles au panier` : "Ajouter au panier"}
        className="btn-lg btn-block"
      />
    </div>
  );
}
