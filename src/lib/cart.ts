import { getProductById, type Product } from "@/data/products";

export const MAX_QUANTITY_PER_LINE = 99;
export const CART_STORAGE_KEY = "vappino.cart.v1";

/** Persisted shape: only ids + quantities; product data is always re-read from the catalog. */
export interface StoredCartLine {
  productId: string;
  quantity: number;
}

export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, Math.floor(quantity)));
}

export function resolveLines(stored: StoredCartLine[]): CartLine[] {
  return stored.flatMap(({ productId, quantity }) => {
    const product = getProductById(productId);
    if (!product) return [];
    return [{ product, quantity, lineTotal: product.price * quantity }];
  });
}

export function parseStoredCart(raw: string | null): StoredCartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (
        item &&
        typeof item.productId === "string" &&
        typeof item.quantity === "number" &&
        getProductById(item.productId)
      ) {
        return [{ productId: item.productId, quantity: clampQuantity(item.quantity) }];
      }
      return [];
    });
  } catch {
    return [];
  }
}
