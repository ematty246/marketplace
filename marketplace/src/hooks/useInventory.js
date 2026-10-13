import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminProducts } from "../services/productService";
import { getErrorMessage } from "../api/axios";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // reload({ silent: true }) refreshes without swapping the list for skeletons.
  const reload = useCallback(async (opts) => {
    if (opts?.silent !== true) setLoading(true);
    setError("");
    try {
      const data = await getAdminProducts();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const stats = useMemo(
    () => ({
      total: products.length,
      available: products.filter((p) => p.is_available === true && Number(p.stock_quantity) > 0).length,
      outOfStock: products.filter((p) => Number(p.stock_quantity) === 0).length,
      units: products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0),
    }),
    [products]
  );

  return { products, loading, error, reload, stats };
}