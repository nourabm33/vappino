"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { CartIcon, CheckIcon } from "@/components/ui/Icons";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  quantity?: number;
  className?: string;
  label?: string;
  compact?: boolean;
}

export function AddToCartButton({
  productId,
  productName,
  quantity = 1,
  className = "",
  label = "Ajouter au panier",
  compact,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <>
      <button
        type="button"
        className={`btn ${added ? "btn-secondary" : "btn-primary"} ${className}`}
        onClick={() => {
          addItem(productId, quantity);
          setAdded(true);
        }}
        aria-label={compact ? `${label} : ${productName}` : undefined}
      >
        {added ? <CheckIcon size={18} /> : <CartIcon size={18} />}
        {compact ? (added ? "Ajouté" : "Ajouter") : added ? "Ajouté au panier" : label}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {added ? `${productName} ajouté au panier.` : ""}
      </span>
    </>
  );
}
