"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  clampQuantity,
  parseStoredCart,
  resolveLines,
  type CartLine,
  type StoredCartLine,
} from "@/lib/cart";

interface CartContextValue {
  /** False until the cart has been read from localStorage. */
  ready: boolean;
  items: StoredCartLine[];
  lines: CartLine[];
  itemCount: number;
  /** Indicative subtotal; the backend recomputes the authoritative total. */
  subtotal: number;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoredCartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(parseStoredCart(localStorage.getItem(CART_STORAGE_KEY)));
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) setItems(parseStoredCart(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable (private mode / quota) */
    }
  }, [items, ready]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId
            ? { ...l, quantity: clampQuantity(l.quantity + quantity) }
            : l,
        );
      }
      return [...prev, { productId, quantity: clampQuantity(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, quantity: clampQuantity(quantity) } : l,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const increment = useCallback(
    (productId: string) => addItem(productId, 1),
    [addItem],
  );

  const decrement = useCallback((productId: string) => {
    setItems((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== productId) return [l];
        return l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }];
      }),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = resolveLines(items);
    return {
      ready,
      items,
      lines,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      addItem,
      setQuantity,
      increment,
      decrement,
      removeItem,
      clearCart,
    };
  }, [items, ready, addItem, setQuantity, increment, decrement, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
