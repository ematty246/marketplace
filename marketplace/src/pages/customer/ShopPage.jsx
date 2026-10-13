import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Leaf, PackageSearch, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import ProductGrid from "../../components/customer/ProductGrid.jsx";
import CategoryFilter from "../../components/customer/CategoryFilter.jsx";
import { useShopProducts } from "../../hooks/useShopProducts";
import { useCart } from "../../context/CartContext.jsx";

export default function ShopPage() {
  const { products, loading, error, reload } = useShopProducts();
  const { syncWithProducts } = useCart();
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const category = params.get("category") ?? "";

  useEffect(() => {
    document.title = "Pure Pail Marketplace";
  }, []);

  // Keep any saved cart in step with current prices and stock.
  useEffect(() => {
    if (!loading && !error) syncWithProducts(products);
  }, [products, loading, error, syncWithProducts]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const visible = useMemo(
    () =>
      products
        .filter((p) => !category || p.category === category)
        .filter((p) => !q || `${p.name} ${p.category} ${p.description ?? ""}`.toLowerCase().includes(q)),
    [products, category, q]
  );

  const setCategory = (c) =>
    setParams((prev) => {
      const n = new URLSearchParams(prev);
      c ? n.set("category", c) : n.delete("category");
      return n;
    }, { replace: true });

  return (
    <>
      <section className="shop-container">
        <div className="shop-hero">
          <div className="shop-hero__copy">
            <span className="shop-hero__eyebrow">PURE PAIL MARKETPLACE</span>
            <h1>Fresh dairy and everyday essentials, delivered to your door.</h1>
            <p>Shop milk, curd, paneer, ghee and more. Pay with cash when your order arrives.</p>
            <a href="#products" className="btn shop-hero__cta">Shop now</a>
            <ul className="shop-hero__points">
              <li><Leaf size={17} aria-hidden="true" /> Farm-fresh quality</li>
              <li><Truck size={17} aria-hidden="true" /> Cash on delivery</li>
              <li><ShieldCheck size={17} aria-hidden="true" /> Secure checkout</li>
            </ul>
          </div>
          <span className="shop-hero__drop shop-hero__drop--a" aria-hidden="true" />
          <span className="shop-hero__drop shop-hero__drop--b" aria-hidden="true" />
        </div>
      </section>

      <section id="products" className="shop-container shop-section" aria-labelledby="shop-title">
        <div className="shop-section__head">
          <h2 id="shop-title">{q ? `Results for “${params.get("q")}”` : category || "All products"}</h2>
          {!loading && !error && <p className="page__sub">{visible.length} product{visible.length === 1 ? "" : "s"}</p>}
        </div>

        {categories.length > 0 && <CategoryFilter categories={categories} value={category} onChange={setCategory} />}

        {error ? (
          <div className="alert alert--error" role="alert">
            <AlertTriangle size={18} /> <span>{error}</span>
            <button className="btn btn--secondary btn--sm" onClick={reload}><RefreshCw size={14} /> Retry</button>
          </div>
        ) : loading ? (
          <div className="shop-grid" aria-busy="true" aria-label="Loading products">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="skeleton shop-skel" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <PackageSearch size={40} aria-hidden="true" />
            <h3>{products.length === 0 ? "No products available yet" : "No products match your search"}</h3>
            <p>{products.length === 0 ? "Please check back soon." : "Try a different word or choose another category."}</p>
            {products.length > 0 && <button className="btn btn--secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}
          </div>
        ) : (
          <ProductGrid products={visible} />
        )}
      </section>
    </>
  );
}
