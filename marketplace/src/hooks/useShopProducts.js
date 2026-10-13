import { useCallback, useEffect, useState } from "react";
import { friendlyError, getProducts } from "../services/customerApi";

export function useShopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Resolves to the fresh list (or null on failure) so callers can re-validate the cart.
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getProducts();
      setProducts(list);
      return list;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { products, loading, error, reload };
}
