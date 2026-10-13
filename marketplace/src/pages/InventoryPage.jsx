import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, Minus, PackageSearch, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import ProductThumb from "../components/ProductThumb.jsx";
import { useInventory } from "../hooks/useInventory";
import { updateProduct } from "../services/productService";
import { getErrorMessage } from "../api/axios";

const THRESHOLDS = [5, 10, 20, 50];
const TABS = [
  ["all", "All"],
  ["in", "In stock"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];
const LABEL = { out: "Out of stock", low: "Low stock", in: "In stock" };

const stockOf = (p) => Number(p.stock_quantity) || 0;
function levelOf(n, threshold) {
  if (n === 0) return "out";
  return n <= threshold ? "low" : "in";
}

function StockRow({ product, threshold, onSaved }) {
  const current = stockOf(product);
  const level = levelOf(current, threshold);
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const next = value === "" ? null : parseInt(value, 10);
  const changed = next !== null && next !== current;
  const pct = Math.min(100, (current / (threshold * 3)) * 100);

  const step = (d) => setValue((v) => String(Math.max(0, (parseInt(v, 10) || 0) + d)));

  const save = async () => {
    if (!changed) return;
    setSaving(true);
    try {
      // Send the full record so nothing else on the product changes; no image = keep current image.
      const fd = new FormData();
      fd.append("name", product.name);
      fd.append("category", product.category ?? "");
      fd.append("description", product.description ?? "");
      fd.append("price", String(product.price));
      fd.append("stock_quantity", String(next));
      fd.append("unit", product.unit ?? "");
      fd.append("is_available", String(product.is_available === true));
      await updateProduct(product.id, fd);
      toast.success(`${product.name}: stock set to ${next}.`);
      await onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="inv-row">
      <div className="inv-product">
        <ProductThumb product={product} />
        <div className="inv-product__text">
          <Link to={`/admin/products/${product.id}/edit`} className="inv-product__name">{product.name}</Link>
          <span className="inv-product__meta">{product.category}{product.unit ? ` · ${product.unit}` : ""}</span>
        </div>
      </div>

      <div className="inv-level">
        <div className="inv-bar" role="img" aria-label={`${current} units in stock`}>
          <span className={`inv-bar__fill inv-bar__fill--${level}`} style={{ width: `${current === 0 ? 0 : Math.max(pct, 4)}%` }} />
        </div>
        <span className="inv-level__num"><strong>{current.toLocaleString("en-IN")}</strong> units</span>
      </div>

      <div className="inv-status">
        <span className={`badge badge--${level === "in" ? "ok" : level === "low" ? "hidden" : "out"}`}>{LABEL[level]}</span>
        {product.is_available !== true && <span className="inv-hidden">Hidden from shop</span>}
      </div>

      <div className="inv-adjust">
        <div className="inv-stepper">
          <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label={`Decrease stock of ${product.name}`}><Minus size={16} /></button>
          <input
            className="input"
            inputMode="numeric"
            aria-label={`Stock quantity for ${product.name}`}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 7))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); save(); }
              if (e.key === "ArrowUp") { e.preventDefault(); step(1); }
              if (e.key === "ArrowDown") { e.preventDefault(); step(-1); }
            }}
          />
          <button type="button" className="icon-btn" onClick={() => step(1)} aria-label={`Increase stock of ${product.name}`}><Plus size={16} /></button>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={!changed || saving}>
          <Check size={15} /> {saving ? "Saving…" : "Save"}
        </button>
        {changed && !saving && (
          <button type="button" className="icon-btn inv-undo" onClick={() => setValue(String(current))} aria-label="Undo change"><RotateCcw size={16} /></button>
        )}
      </div>
    </li>
  );
}

export default function InventoryPage() {
  const { products, loading, error, reload, stats } = useInventory();
  const [tab, setTab] = useState("all");
  const [threshold, setThreshold] = useState(10);
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = { all: products.length, in: 0, low: 0, out: 0 };
    products.forEach((p) => { c[levelOf(stockOf(p), threshold)] += 1; });
    return c;
  }, [products, threshold]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => tab === "all" || levelOf(stockOf(p), threshold) === tab)
      .filter((p) => !term || `${p.name} ${p.category}`.toLowerCase().includes(term))
      .sort((a, b) => stockOf(a) - stockOf(b) || a.name.localeCompare(b.name)); // most urgent first
  }, [products, tab, threshold, q]);

  const refreshQuietly = () => reload({ silent: true });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Inventory</h2>
          <p className="page__sub">
            {loading ? "Loading stock levels…" : `${stats.units.toLocaleString("en-IN")} units across ${stats.total} products. Update quantities right here.`}
          </p>
        </div>
        <button className="btn btn--secondary" onClick={() => reload()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={() => reload()}>Try again</button>
        </div>
      )}

      <div className="inv-controls">
        <div className="inv-tabs" role="group" aria-label="Stock level">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" className={`inv-tab inv-tab--${key}${tab === key ? " inv-tab--on" : ""}`} aria-pressed={tab === key} onClick={() => setTab(key)}>
              {label} <span className="inv-tab__count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="inv-threshold">
          <span>Low stock at or below</span>
          <select className="input" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            {THRESHOLDS.map((t) => <option key={t} value={t}>{t} units</option>)}
          </select>
        </label>
        <div className="toolbar__search inv-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or category" aria-label="Filter inventory" />
        </div>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Loading inventory">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton--row" />)}
        </div>
      ) : !error && rows.length === 0 ? (
        <div className="empty">
          <PackageSearch size={40} aria-hidden="true" />
          <h3>{products.length === 0 ? "No stock to track yet" : "Nothing in this view"}</h3>
          <p>{products.length === 0 ? "Add a product to start tracking its stock." : "Try another stock level or clear the filter."}</p>
        </div>
      ) : (
        <ul className="inv-list">
          <li className="inv-head" aria-hidden="true"><span>Product</span><span>Stock level</span><span>Status</span><span>Adjust stock</span></li>
          {rows.map((p) => (
            <StockRow key={`${p.id}-${stockOf(p)}`} product={p} threshold={threshold} onSaved={refreshQuietly} />
          ))}
        </ul>
      )}
    </div>
  );
}