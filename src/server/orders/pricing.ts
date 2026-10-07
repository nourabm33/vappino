import { getProductById } from "@/data/products";
import { MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { ApiError } from "../errors";
import type { OrderItem, OrderItemInput } from "./types";
import { invalidQuantity } from "./validate";

/** Prices an order exclusively from the server-side catalog. Duplicate lines are merged. */
export function priceItems(items: OrderItemInput[]): { items: OrderItem[]; total: number } {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  const lines: OrderItem[] = [];
  for (const [productId, quantity] of merged) {
    const product = getProductById(productId);
    if (!product) {
      throw new ApiError(400, "invalid_product", "Un produit de votre panier n'est plus disponible.", {
        productId: productId.slice(0, 64),
      });
    }
    if (quantity > MAX_QUANTITY_PER_LINE) throw invalidQuantity(productId);
    lines.push({
      productId: product.id,
      productName: product.name,
      specification: product.specification,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    });
  }
  return { items: lines, total: lines.reduce((sum, line) => sum + line.subtotal, 0) };
}
