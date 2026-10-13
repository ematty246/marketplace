import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import OrderCard from "../../components/customer/OrderCard.jsx";
import { friendlyError, getMyOrders, normalizeOrder } from "../../services/customerApi";

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const fromState = state?.order ? normalizeOrder(state.order) : null;
  const justPlaced = !!fromState && String(fromState.id) === orderId;
  const [order, setOrder] = useState(justPlaced ? fromState : null);
  const [loading, setLoading] = useState(!justPlaced);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = "Order · Pure Pail Marketplace";
  }, []);

  // Direct visits or refreshes: look the order up in the customer's own order list.
  useEffect(() => {
    if (justPlaced) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getMyOrders();
        const found = list.map(normalizeOrder).find((o) => String(o.id) === orderId);
        if (!cancelled) {
          setOrder(found ?? null);
          if (!found) setError("We could not find that order on your account.");
        }
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, justPlaced, tick]);

  return (
    <div className="shop-container shop-section shop-narrow">
      {justPlaced && (
        <div className="shop-success" role="status">
          <CheckCircle2 size={36} aria-hidden="true" />
          <div>
            <h1>Thank you. Your order is placed.</h1>
            <p>Order #{order.number}. Pay in cash when it arrives.</p>
          </div>
        </div>
      )}
      {!justPlaced && <h1 className="page__title">Order details</h1>}

      {loading ? <div className="skeleton skeleton--block" aria-busy="true" />
        : error ? (
          <div className="alert alert--error" role="alert">
            <AlertTriangle size={18} /> <span>{error}</span>
            <button className="btn btn--secondary btn--sm" onClick={() => setTick((t) => t + 1)}><RefreshCw size={14} /> Retry</button>
          </div>
        ) : order && <OrderCard order={order} />}

      <div className="shop-actions">
        <Link to="/orders" className="btn btn--secondary">My orders</Link>
        <Link to="/shop" className="btn btn--primary">Continue shopping</Link>
      </div>
    </div>
  );
}
