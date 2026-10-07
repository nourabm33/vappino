import Link from "next/link";
import type { Product } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";
import { ProductImage } from "./ProductImage";
import { SpecBadge } from "./SpecBadge";
import styles from "./ProductCard.module.css";

export const PRODUCT_CARD_SIZES = "(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  return (
    <article className={styles.card}>
      <ProductImage
        product={product}
        sizes={PRODUCT_CARD_SIZES}
        priority={priority}
        className={styles.media}
      />
      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link href={`/product/${product.id}`} className={styles.link}>
            {product.name}
          </Link>
        </h3>
        <div className={styles.meta}>
          <SpecBadge value={product.specification} />
          <span className={styles.price}>
            <span className="visually-hidden">Prix : </span>
            {formatPrice(product.price, product.currency)}
          </span>
        </div>
        <div className={styles.footer}>
          <AddToCartButton productId={product.id} productName={product.name} compact className="btn-sm" />
        </div>
      </div>
    </article>
  );
}
