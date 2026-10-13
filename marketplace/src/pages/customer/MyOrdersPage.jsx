import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, PackageOpen, RefreshCw } from "lucide-react";
import OrderCard from "../../components/customer/OrderCard.jsx";
import { friendlyError, getMyOrders, normalizeOrder } from "../../services/customerApi";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders((await getMyOrders()).map(normalizeOrder));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "My orders · Pure Pail Marketplace";
    load();
  }, [load]);

  return (
    <div className="shop-container shop-section shop-narrow">
      <h1 className="page__title">My orders</h1>
      {error ? (
        <div className="alert alert--error" role="alert">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={load}><RefreshCw size={14} /> Retry</button>
        </div>
      ) : loading ? (
        <div aria-busy="true" aria-label="Loading orders">{[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton--block skeleton--gap" />)}</div>
      ) : orders.length === 0 ? (
        <div className="empty">
          <PackageOpen size={40} aria-hidden="true" />
          <h3>No orders yet</h3>
          <p>When you place an order, it will show up here.</p>
          <Link to="/shop" className="btn btn--primary">Start shopping</Link>
        </div>
      ) : (
        <div className="shop-orders">{orders.map((o, i) => <OrderCard key={o.id ?? i} order={o} linked />)}</div>
      )}
    </div>
  );
}
