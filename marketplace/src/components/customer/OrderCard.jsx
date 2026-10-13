import { Link } from "react-router-dom";
import { formatPaise } from "../../utils/money";
import { formatDate, labelFor } from "../../services/customerApi";

const payTone = (s) =>
  String(s).toUpperCase() === "PAID" ? "ok" : "warning";
export default function OrderCard({ order, linked }) {
  return (
    <article className="shop-order card">
      <header className="shop-order__head">
        <div>
          <h3>Order {linked && order.id != null ? <Link to={`/orders/${order.id}`}>#{order.number}</Link> : `#${order.number}`}</h3>
          <p className="page__sub">{formatDate(order.createdAt)}</p>
        </div>
        <div className="shop-order__badges">
          <span className="badge badge--info">{labelFor(order.status)}</span>
          <span className={`badge badge--${payTone(order.paymentStatus)}`}>{labelFor(order.paymentStatus)}</span>
        </div>
      </header>
      <ul className="shop-order__items">
        {order.items.map((i, idx) => (
          <li key={`${i.productId}-${idx}`}>
            <span>{i.name}{i.unit ? ` (${i.unit})` : ""} × {i.quantity}</span>
            <span>{formatPaise(i.subtotalPaise)}</span>
          </li>
        ))}
      </ul>
      <dl className="shop-order__meta">
        <div><dt>Payment method</dt><dd>{labelFor(order.paymentMethod)}</dd></div>
        <div><dt>Delivery address</dt><dd>{order.address || "—"}</dd></div>
        <div className="shop-order__total"><dt>Total</dt><dd>{formatPaise(order.totalPaise)}</dd></div>
      </dl>
    </article>
  );
}
