"use client";

import Link from "next/link";
import type { CartLine } from "@/lib/cart";
import { MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/product/ProductImage";
import { SpecBadge } from "@/components/product/SpecBadge";
import { TrashIcon } from "@/components/ui/Icons";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { useCart } from "./CartProvider";
import styles from "./CartLineItem.module.css";

export function CartLineItem({ line }: { line: CartLine }) {
  const { increment, decrement, removeItem } = useCart();
  const { product, quantity, lineTotal } = line;

  return (
    <li className={styles.item}>
      <ProductImage product={product} sizes="104px" className={styles.thumb} />
      <div className={styles.info}>
        <h3 className={styles.name}>
          <Link href={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div>
          <SpecBadge value={product.specification} />
        </div>
        <p className={styles.unit}>
          Prix unitaire : {formatPrice(product.price, product.currency)}
        </p>
      </div>
      <div className={styles.controls}>
        <QuantitySelector
          value={quantity}
          onDecrement={() => decrement(product.id)}
          onIncrement={() => increment(product.id)}
          max={MAX_QUANTITY_PER_LINE}
          label={`Quantité pour ${product.name}`}
          size="sm"
          allowBelowMin
        />
        <div className={styles.right}>
          <span className={styles.lineTotal}>
            <span className="visually-hidden">Total ligne : </span>
            {formatPrice(lineTotal)}
          </span>
          <button
            type="button"
            className={styles.remove}
            onClick={() => removeItem(product.id)}
            aria-label={`Retirer ${product.name} du panier`}
          >
            <TrashIcon size={20} />
          </button>
        </div>
      </div>
    </li>
  );
}
