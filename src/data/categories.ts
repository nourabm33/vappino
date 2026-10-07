export type CategoryId = "devices" | "capsules" | "liquids" | "other";

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

/**
 * Category list driving filters and home shortcuts.
 * Reassign a product's `category` in products.ts to reclassify it.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: "devices",
    label: "Puffs & kits",
    description: "Appareils jetables et kits prêts à l'emploi.",
  },
  {
    id: "capsules",
    label: "Capsules",
    description: "Capsules et recharges pour vos pods.",
  },
  {
    id: "liquids",
    label: "Salts & liquides",
    description: "E-liquides au sel de nicotine.",
  },
  {
    id: "other",
    label: "Autres",
    description: "Accessoires, packs et autres produits.",
  },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
