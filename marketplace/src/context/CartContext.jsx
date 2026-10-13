import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toPaise } from "../utils/money";

const KEY = "pp_cart_v1"; // product snapshots + quantities only. Never tokens or customer data.
const CartContext = createContext(null);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter((i) => Number.isInteger(i?.productId) && Number.isInteger(i?.quantity) && i.quantity > 0 && Number.isFinite(i.pricePaise))
      : [];
  } catch {
    return [];
  }
}

const stockOf = (p) => Math.max(0, parseInt(p?.stock_quantity, 10) || 0);
const isBuyable = (p) => p?.is_available === true && stockOf(p) > 0;
const snapshot = (p) => ({
  productId: p.id,
  name: p.name,
  category: p.category ?? "",
  unit: p.unit ?? "",
  image: p.image_url ?? p.image ?? null,
  pricePaise: toPaise(p.price),
  stock: stockOf(p),
});

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const ref = useRef(items);
  ref.current = items;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked: cart still works for this session */
    }
  }, [items]);

  const add = useCallback((product, qty = 1) => {
    if (!isBuyable(product)) return { ok: false, reason: "unavailable" };
    const have = ref.current.find((i) => i.productId === product.id)?.quantity ?? 0;
    const room = stockOf(product) - have;
    if (room <= 0) return { ok: false, reason: "max" };
    const addQty = Math.min(room, Math.max(1, Math.floor(qty)));
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx < 0) return [...prev, { ...snapshot(product), quantity: addQty }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...snapshot(product), quantity: next[idx].quantity + addQty, unavailable: false };
      return next;
    });
    return { ok: true, added: addQty, capped: addQty < qty };
  }, []);

  const setQty = useCallback((productId, qty) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(Math.max(1, Math.floor(qty) || 1), Math.max(1, i.stock)) } : i))
    );
  }, []);

  const remove = useCallback((productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  // Re-validate against fresh backend data: prices, stock, availability.
  const syncWithProducts = useCallback((products) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const result = { unavailable: [], adjusted: [], repriced: [] };
    const next = ref.current.map((item) => {
      const p = byId.get(item.productId);
      if (!p || !isBuyable(p)) {
        result.unavailable.push(item.name);
        return { ...item, stock: p ? stockOf(p) : 0, unavailable: true };
      }
      const snap = snapshot(p);
      if (snap.pricePaise !== item.pricePaise) result.repriced.push(snap.name);
      let quantity = item.quantity;
      if (quantity > snap.stock) {
        quantity = snap.stock;
        result.adjusted.push(snap.name);
      }
      return { ...item, ...snap, quantity, unavailable: false };
    });
    setItems(next);
    return result;
  }, []);

  const value = useMemo(() => {
    const live = items.filter((i) => !i.unavailable);
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      totalPaise: live.reduce((s, i) => s + i.pricePaise * i.quantity, 0),
      hasUnavailable: items.some((i) => i.unavailable),
      quantityOf: (id) => items.find((i) => i.productId === id)?.quantity ?? 0,
      add,
      setQty,
      remove,
      clear,
      syncWithProducts,
    };
  }, [items, add, setQty, remove, clear, syncWithProducts]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
