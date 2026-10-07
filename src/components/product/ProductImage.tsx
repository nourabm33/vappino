import Image from "next/image";
import type { CategoryId } from "@/data/categories";
import type { Product } from "@/data/products";
import { BoxIcon, CloudIcon, DropIcon, LayersIcon } from "@/components/ui/Icons";
import styles from "./ProductImage.module.css";

const CATEGORY_ICON: Record<CategoryId, typeof CloudIcon> = {
  devices: CloudIcon,
  capsules: LayersIcon,
  liquids: DropIcon,
  other: BoxIcon,
};

interface ProductImageProps {
  product: Product;
  sizes: string;
  priority?: boolean;
  large?: boolean;
  className?: string;
  imageClassName?: string;
}

export function ProductImage({
  product,
  sizes,
  priority,
  large,
  className = "",
  imageClassName = "",
}: ProductImageProps) {
  const Icon = CATEGORY_ICON[product.category];
  return (
    <div className={`${styles.frame} ${large ? styles.large : ""} ${className}`}>
      {product.image ? (
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          className={`${styles.img} ${imageClassName}`}
        />
      ) : (
        <div
          className={`${styles.placeholder} ${styles[product.category]}`}
          role="img"
          aria-label={`${product.name} — photo bientôt disponible`}
        >
          <Icon size={large ? 40 : 28} className={styles.phIcon} />
          <span className={styles.phSpec}>{product.specification ?? product.name}</span>
          {product.specification && <span className={styles.phName}>{product.name}</span>}
        </div>
      )}
    </div>
  );
}
