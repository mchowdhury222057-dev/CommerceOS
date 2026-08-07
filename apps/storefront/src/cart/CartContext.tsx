import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  imageUrl: string | null;
  variantAttributes: Record<string, string>;
  unitPrice: string;
  stock: number;
  quantity: number;
}

interface CartContextValue {
  storeSlug: string;
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Client-side only (Part 21's scope note - no backend cart persistence in
// V1); deliberately does not survive a refresh. Scoped to one storeSlug at
// a time - if the shopper navigates to a different store's URL, the cart
// resets rather than mixing product/variant IDs across two unrelated
// stores' catalogs.
export function CartProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [trackedSlug, setTrackedSlug] = useState(storeSlug);

  if (trackedSlug !== storeSlug) {
    setTrackedSlug(storeSlug);
    setItems([]);
  }

  function addItem(item: Omit<CartItem, "quantity">, quantity: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, item.stock);
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.stock) }];
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(quantity, i.stock)) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  function clear() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

  const value = useMemo(
    () => ({ storeSlug, items, itemCount, total, addItem, updateQuantity, removeItem, clear }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeSlug, items, itemCount, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
