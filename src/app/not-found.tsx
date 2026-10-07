import Link from "next/link";
import { SearchIcon } from "@/components/ui/Icons";
import { StatusCard } from "@/components/ui/StatusCard";

export default function NotFound() {
  return (
    <div className="container">
      <StatusCard
        tone="neutral"
        icon={<SearchIcon size={28} />}
        title="Page introuvable"
        description="La page ou le produit demandé n'existe pas ou n'est plus disponible."
        actions={
          <>
            <Link href="/shop" className="btn btn-primary">
              Voir les produits
            </Link>
            <Link href="/" className="btn btn-secondary">
              Accueil
            </Link>
          </>
        }
      />
    </div>
  );
}
