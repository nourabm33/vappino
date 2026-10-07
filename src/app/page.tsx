import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, type CategoryId } from "@/data/categories";
import { PRODUCTS, getFeaturedProducts, getPopularProducts } from "@/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import {
  ArrowRightIcon,
  BoxIcon,
  CloudIcon,
  DropIcon,
  GridIcon,
  LayersIcon,
  PhoneIcon,
  TagIcon,
} from "@/components/ui/Icons";
import { SITE } from "@/lib/site";
import styles from "@/components/home/Home.module.css";

const CATEGORY_STYLE: Record<CategoryId, { icon: typeof CloudIcon; color: string }> = {
  devices: { icon: CloudIcon, color: "var(--brand-cyan)" },
  capsules: { icon: LayersIcon, color: "var(--brand-violet)" },
  liquids: { icon: DropIcon, color: "var(--brand-mint)" },
  other: { icon: BoxIcon, color: "var(--brand-magenta)" },
};

const WHY = [
  {
    icon: BoxIcon,
    title: "Gros & détail",
    text: "Achetez à l'unité ou en quantité, selon vos besoins.",
  },
  {
    icon: TagIcon,
    title: "Prix clairs en DT",
    text: "Chaque produit affiche son prix en dinars tunisiens, sans surprise.",
  },
  {
    icon: GridIcon,
    title: "Catalogue lisible",
    text: "Spécifications visibles (80K, 30ml…) pour trouver le bon produit rapidement.",
  },
  {
    icon: PhoneIcon,
    title: "Commande simple",
    text: "Votre nom et votre numéro suffisent. Aucun paiement en ligne.",
  },
];

export default function HomePage() {
  const featured = getFeaturedProducts();
  const popular = getPopularProducts();

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className="eyebrow">{SITE.tagline}</span>
            <h1 id="hero-title" className={styles.heroTitle}>
              Découvrez votre <span className="text-gradient">sélection.</span>
            </h1>
            <p className={styles.heroLead}>
              Puffs, kits, capsules et e-liquides : parcourez le catalogue {SITE.name} et commandez en
              quelques clics.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/shop" className="btn btn-primary btn-lg">
                Voir les produits
                <ArrowRightIcon size={18} />
              </Link>
              <Link href="#categories" className="btn btn-secondary btn-lg">
                Découvrir
              </Link>
            </div>
            <ul className={styles.facts}>
              <li className={styles.fact}>
                <span className={styles.factValue}>{PRODUCTS.length}</span>
                <span className={styles.factLabel}>produits</span>
              </li>
              <li className={styles.fact}>
                <span className={styles.factValue}>{CATEGORIES.length}</span>
                <span className={styles.factLabel}>catégories</span>
              </li>
              <li className={styles.fact}>
                <span className={styles.factValue}>DT</span>
                <span className={styles.factLabel}>prix en dinars</span>
              </li>
            </ul>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src={SITE.logo.src}
              alt={SITE.logo.alt}
              width={SITE.logo.width}
              height={SITE.logo.height}
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="featured-title">
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadText}>
            <span className="eyebrow">À la une</span>
            <h2 id="featured-title" className={styles.sectionTitle}>
              Produits en vedette
            </h2>
          </div>
          <Link href="/shop" className={styles.sectionLink}>
            Toute la boutique <ArrowRightIcon size={16} />
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section id="categories" className={`container ${styles.section}`} aria-labelledby="categories-title">
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadText}>
            <span className="eyebrow">Catégories</span>
            <h2 id="categories-title" className={styles.sectionTitle}>
              Trouvez ce qu&apos;il vous faut
            </h2>
          </div>
        </div>
        <ul className={styles.categories}>
          {CATEGORIES.map((c) => {
            const { icon: Icon, color } = CATEGORY_STYLE[c.id];
            const count = PRODUCTS.filter((p) => p.category === c.id).length;
            return (
              <li key={c.id}>
                <Link
                  href={`/shop?category=${c.id}`}
                  className={styles.category}
                  style={{ "--cat-color": color } as React.CSSProperties}
                >
                  <span className={styles.categoryIcon} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <span className={styles.categoryName}>{c.label}</span>
                  <span className={styles.categoryDesc}>{c.description}</span>
                  <span className={styles.categoryMeta}>
                    {count} produit{count > 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="popular-title">
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadText}>
            <span className="eyebrow">Populaires</span>
            <h2 id="popular-title" className={styles.sectionTitle}>
              Les plus demandés
            </h2>
          </div>
          <Link href="/shop?category=devices" className={styles.sectionLink}>
            Voir les puffs <ArrowRightIcon size={16} />
          </Link>
        </div>
        <ProductGrid products={popular} />
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="why-title">
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadText}>
            <span className="eyebrow">Pourquoi {SITE.name}</span>
            <h2 id="why-title" className={styles.sectionTitle}>
              Une boutique pensée pour vous
            </h2>
          </div>
        </div>
        <ul className={styles.why}>
          {WHY.map(({ icon: Icon, title, text }) => (
            <li key={title} className={styles.whyItem}>
              <span className={styles.whyIcon} aria-hidden="true">
                <Icon size={24} />
              </span>
              <div>
                <h3 className={styles.whyTitle}>{title}</h3>
                <p className={styles.whyText}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="cta-title">
        <div className={styles.cta}>
          <div>
            <h2 id="cta-title" className={styles.ctaTitle}>
              Prêt à passer commande&nbsp;?
            </h2>
            <p className={styles.ctaText}>
              Ajoutez vos produits au panier, indiquez votre nom et votre numéro : c&apos;est tout.
            </p>
          </div>
          <Link href="/shop" className="btn btn-primary btn-lg">
            Voir les produits
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
