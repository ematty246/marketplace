import { Link } from "react-router-dom";

export default function CustomerFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-container shop-footer__inner">
        <p><strong>Pure Pail Marketplace</strong> · Fresh dairy and everyday essentials.</p>
        <nav aria-label="Footer">
          <Link to="/shop">Shop</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">My orders</Link>
        </nav>
      </div>
    </footer>
  );
}
