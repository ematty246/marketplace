import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, CheckCircle2, Package, PackageX, Plus } from "lucide-react";
import StatCard from "../components/StatCard.jsx";
import ProductThumb from "../components/ProductThumb.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useInventory } from "../hooks/useInventory";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { products, loading, error, reload, stats } = useInventory();
  const first = (user?.name || "").split(" ")[0];
  const attention = products.filter((p) => Number(p.stock_quantity) === 0).slice(0, 6);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Welcome back{first ? `, ${first}` : ""}</h2>
          <p className="page__sub">Here is where your dairy catalog stands today.</p>
        </div>
        <Link to="/admin/products/new" className="btn btn--primary"><Plus size={18} /> Add product</Link>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={reload}>Try again</button>
        </div>
      )}

      <section aria-labelledby="overview">
        <h3 id="overview" className="section-title">Inventory overview</h3>
        <div className="stats">
          <StatCard label="Total products" value={stats.total} icon={Package} loading={loading} />
          <StatCard label="Available products" value={stats.available} icon={CheckCircle2} loading={loading} />
          <StatCard label="Out of stock" value={stats.outOfStock} icon={PackageX} tone="warn" loading={loading} />
          <StatCard label="Total stock units" value={stats.units} icon={Boxes} tone="butter" loading={loading} />
        </div>
      </section>

      <section className="card" aria-labelledby="restock">
        <div className="card__row">
          <h3 id="restock" className="card__title">Needs restocking</h3>
          <Link to="/admin/inventory" className="card__link">View inventory</Link>
        </div>
        {loading ? (
          <div className="skeleton skeleton--block" />
        ) : attention.length === 0 ? (
          <p className="empty-inline">{stats.total === 0 ? "No products yet. Add your first product to start building the catalog." : "Every product has stock. Nothing needs attention."}</p>
        ) : (
          <ul className="restock">
            {attention.map((p) => (
              <li key={p.id}>
                <ProductThumb product={p} />
                <span className="restock__name">{p.name}</span>
                <span className="badge badge--out">Out of stock</span>
                <Link to={`/admin/products/${p.id}/edit`} className="btn btn--secondary btn--sm">Update stock</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
