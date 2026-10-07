import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/data/categories";
import { PRODUCTS, getProductById, getRelatedProducts } from "@/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { SpecBadge } from "@/components/product/SpecBadge";
import { formatPrice } from "@/lib/format";
import styles from "./Product.module.css";

type Params = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = getProductById((await params).id);
  if (!product) return {};
  const title = product.name;
  const description = `${product.name}${product.specification ? ` (${product.specification})` : ""} — ${formatPrice(product.price, product.currency)}.`;
  return {
    title,
    description,
    openGraph: { title, description, ...(product.image ? { images: [product.image] } : {}) },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = getProductById((await params).id);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = getRelatedProducts(product);

  return (
    <div className="container">
      <nav aria-label="Fil d'Ariane">
        <ol className={styles.crumbs}>
          <li>
            <Link href="/">Accueil</Link>
          </li>
          <li>
            <Link href="/shop">Boutique</Link>
          </li>
          <li>
            <Link href={`/shop?category=${category.id}`}>{category.label}</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className={styles.layout}>
        <ProductImage
          product={product}
          sizes="(min-width: 900px) 50vw, 100vw"
          priority
          large
          className={styles.media}
        />

        <div className={styles.info}>
          <span className={`eyebrow ${styles.category}`}>{category.label}</span>
          <h1 className={styles.name}>{product.name}</h1>
          <div className={styles.specRow}>
            <SpecBadge value={product.specification} large />
          </div>
          <p className={styles.price}>
            {formatPrice(product.price, product.currency)}
            <span className={styles.priceUnit}>/ unité</span>
          </p>

          <ProductPurchase product={product} />

          <section aria-labelledby="details-title" className={styles.info}>
            <h2 id="details-title" className="visually-hidden">
              Informations produit
            </h2>
            <p className={styles.description}>{product.description}</p>
            <dl className={styles.details}>
              <div className={styles.detailRow}>
                <dt>Produit</dt>
                <dd>{product.name}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Spécification</dt>
                <dd>{product.specification ?? "—"}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Catégorie</dt>
                <dd>{category.label}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Prix unitaire</dt>
                <dd>{formatPrice(product.price, product.currency)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title" className={styles.relatedTitle}>
            Vous aimerez aussi
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
