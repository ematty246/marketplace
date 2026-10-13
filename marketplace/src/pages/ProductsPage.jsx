import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, PackageSearch, Plus, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import ProductTable from "../components/ProductTable.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useInventory } from "../hooks/useInventory";
import { deleteProduct } from "../services/productService";
import { getErrorMessage } from "../api/axios";
import { getStatus } from "../utils/product";

const SORTS = {
  "name-asc": ["Name A–Z", (a, b) => a.name.localeCompare(b.name)],
  "price-asc": ["Price: low to high", (a, b) => a.price - b.price],
  "price-desc": ["Price: high to low", (a, b) => b.price - a.price],
  "stock-asc": ["Stock: low to high", (a, b) => a.stock_quantity - b.stock_quantity],
  "stock-desc": ["Stock: high to low", (a, b) => b.stock_quantity - a.stock_quantity],
};

export default function ProductsPage() {
  const { products, loading, error, reload, stats } = useInventory();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => !term || `${p.name} ${p.category}`.toLowerCase().includes(term))
      .filter((p) => category === "all" || p.category === category)
      .filter((p) => availability === "all" || getStatus(p).key === availability)
      .sort(SORTS[sort][1]);
  }, [products, q, category, availability, sort]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(target.id);
      toast.success(`“${target.name}” was deleted.`);
      setTarget(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err)); // product stays in the list
      setTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = q || category !== "all" || availability !== "all";

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Product catalog</h2>
          <p className="page__sub">
            {loading ? "Loading products…" : `${stats.total} products · ${stats.units.toLocaleString("en-IN")} units in stock`}
          </p>
        </div>
        <Link to="/admin/products/new" className="btn btn--primary"><Plus size={18} /> Add product</Link>
      </div>

      <div className="toolbar" role="group" aria-label="Catalog filters">
        <div className="toolbar__search">
          <Search size={17} aria-hidden="true" />
          <input type="search" className="input" value={q} placeholder="Search by name or category" aria-label="Search products" onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} />
        </div>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filter by availability">
          <option value="all">All statuses</option>
          <option value="ok">Available</option>
          <option value="out">Out of stock</option>
          <option value="hidden">Unavailable</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button className="btn btn--secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={reload}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="skeleton-list" aria-busy="true" aria-label="Loading products">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton--row" />)}
        </div>
      ) : !error && visible.length === 0 ? (
        <div className="empty">
          <PackageSearch size={40} aria-hidden="true" />
          <h3>{filtered ? "No products match these filters" : "Your catalog is empty"}</h3>
          <p>{filtered ? "Try a different search or clear the filters." : "Add your first dairy product to get started."}</p>
          {!filtered && <Link to="/admin/products/new" className="btn btn--primary"><Plus size={18} /> Add product</Link>}
        </div>
      ) : (
        <>
          <div className="only-desktop"><ProductTable products={visible} onDelete={setTarget} /></div>
          <div className="only-mobile pcards">
            {visible.map((p) => <ProductCard key={p.id} product={p} onDelete={setTarget} />)}
          </div>
        </>
      )}

      <ConfirmDialog open={!!target} title="Delete this product?" busy={deleting} onConfirm={confirmDelete} onCancel={() => !deleting && setTarget(null)}>
        <p>You are about to permanently delete <strong>{target?.name}</strong>{target?.category ? ` (${target.category})` : ""}. This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}