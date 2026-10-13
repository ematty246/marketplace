import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import OrderMap from "../components/OrderMap.jsx";
import "../styles/AdminOrdersPage.css";

const money = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v || 0));
const isPaid = (o) => String(o.payment_status).toUpperCase() === "PAID";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null); // order awaiting "are you sure?"
  const [savingId, setSavingId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Shared client: attaches the in-memory admin token and refreshes it when it expires.
      const res = await api.get("/orders/admin");
      setOrders(res.data.orders || []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // The backend only supports marking an order as PAID (it cannot be reverted from here).
  const markPaid = async (order) => {
    setSavingId(order.id);
    try {
      const { data } = await api.patch(`/orders/admin/${order.id}/payment-status`, { payment_status: "PAID" });
      const next = data?.order?.payment_status ?? "PAID";
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, payment_status: next } : o)));
      toast.success(data?.message || "Payment marked as paid.");
      setConfirmId(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="admin-orders"><p>Loading orders…</p></div>;

  return (
    <div className="admin-orders">
      <header className="admin-orders__header">
        <div>
          <h1>Customer Orders</h1>
          <p>Customer contacts, items and delivery locations</p>
        </div>
        <button onClick={loadOrders}>Refresh</button>
      </header>

      {error && <p role="alert" className="admin-orders__error">{error}</p>}
      {!error && orders.length === 0 && <p>No orders have been placed yet.</p>}

      <section className="admin-orders__list">
        {orders.map((o) => (
          <article className="admin-order" key={o.id}>
            <div className="admin-order__top">
              <div>
                <h2>Order #{o.order_number}</h2>
                <p>{o.created_at ? new Date(o.created_at).toLocaleString() : "Date unavailable"}</p>
              </div>

              <div className="admin-order__aside">
                
                {isPaid(o) ? (
                  <span className="admin-order__paid"><CheckCircle2 size={18} aria-hidden="true" /> Payment received</span>
                ) : confirmId === o.id ? (
                  <div className="admin-order__confirm" role="group" aria-label={`Confirm payment for order ${o.order_number}`}>
                    <span>Confirm {money(o.total_amount)} was received? This cannot be undone here.</span>
                    <div className="admin-order__confirm-actions">
                      <button className="btn btn--primary btn--sm" onClick={() => markPaid(o)} disabled={savingId === o.id}>
                        {savingId === o.id ? "Saving…" : "Yes, mark as paid"}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setConfirmId(null)} disabled={savingId === o.id}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--secondary btn--sm" onClick={() => setConfirmId(o.id)}>
                    <CheckCircle2 size={16} aria-hidden="true" /> Mark as paid
                  </button>
                )}
              </div>
            </div>

            <div className="admin-order__info">
              <div className="admin-order__customer">
                <p><strong>Customer:</strong> {o.customer_name || "—"}</p>
                <p><strong>Email:</strong> {o.customer_email || "—"}</p>
                <p><strong>Phone:</strong> {o.phone_number || "Not supplied for this historical order"}</p>
                <p><strong>Delivery address:</strong> {o.shipping_address || "—"}</p>
                <p>
                  <strong>Latitude / longitude:</strong>{" "}
                  {o.latitude != null && o.longitude != null ? `${o.latitude}, ${o.longitude}` : "Not recorded for this order"}
                </p>
              </div>
              <OrderMap lat={o.latitude} lng={o.longitude} address={o.shipping_address} mapsUrl={o.google_maps_url} orderNumber={o.order_number} />
            </div>

            <h3>Items ordered</h3>
            <div className="admin-order__table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr>
                </thead>
                <tbody>
                  {(o.items || []).map((it) => (
                    <tr key={it.id}>
                      <td>{it.product_name}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.unit_price)}</td>
                      <td>{money(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="admin-order__footer"><strong>Total: {money(o.total_amount)}</strong></footer>
          </article>
        ))}
      </section>
    </div>
  );
}