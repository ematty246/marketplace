import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShoppingBasket, Trash2 } from "lucide-react";
import CartItem from "../../components/customer/CartItem.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { useShopProducts } from "../../hooks/useShopProducts";
import { formatPaise } from "../../utils/money";

export function noticeFrom(res) {
  const out = [];
  if (res.unavailable.length) out.push(`No longer available: ${res.unavailable.join(", ")}. Remove them to continue.`);
  if (res.adjusted.length) out.push(`Quantity reduced to the available stock: ${res.adjusted.join(", ")}.`);
  if (res.repriced.length) out.push(`Price updated: ${res.repriced.join(", ")}.`);
  return out;
}

export default function CartPage() {
  const { items, count, totalPaise, hasUnavailable, clear, syncWithProducts } = useCart();
  const { products, loading, error } = useShopProducts();
  const [notice, setNotice] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Your cart · Pure Pail Marketplace";
  }, []);

  useEffect(() => {
    if (!loading && !error) setNotice(noticeFrom(syncWithProducts(products)));
  }, [products, loading, error, syncWithProducts]);

  if (items.length === 0) {
    return (
      <div className="shop-container shop-section">
        <div className="empty">
          <ShoppingBasket size={40} aria-hidden="true" />
          <h3>Your cart is empty</h3>
          <p>Add some fresh dairy to get started.</p>
          <Link to="/shop" className="btn btn--primary">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container shop-section">
      <div className="shop-section__head">
        <h1 className="page__title">Your cart</h1>
        <button className="btn btn--ghost btn--sm" onClick={() => window.confirm("Remove every item from your cart?") && clear()}><Trash2 size={15} /> Clear cart</button>
      </div>

      {error && <div className="alert alert--error" role="alert"><AlertTriangle size={18} /> <span>{error} Prices and stock could not be re-checked.</span></div>}
      {notice.map((n) => <div key={n} className="alert alert--info" role="status"><AlertTriangle size={18} /> <span>{n}</span></div>)}

      <div className="shop-cart-layout">
        <ul className="shop-lines card">{items.map((i) => <CartItem key={i.productId} item={i} />)}</ul>
        <aside className="shop-summary card" aria-label="Order summary">
          <h2 className="card__title">Order summary</h2>
          <dl>
            <div><dt>Items</dt><dd>{count}</dd></div>
            <div className="shop-summary__total"><dt>Total</dt><dd>{formatPaise(totalPaise)}</dd></div>
          </dl>
          <p className="field__hint">Final prices and stock are confirmed when you place the order.</p>
          <button className="btn btn--primary btn--block" disabled={hasUnavailable || loading} onClick={() => navigate("/checkout")}>
            Proceed to checkout <ArrowRight size={17} />
          </button>
          <Link to="/shop" className="btn btn--secondary btn--block">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
