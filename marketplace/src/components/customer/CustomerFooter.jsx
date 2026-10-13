import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, Truck } from "lucide-react";
import Logo from "../Logo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CustomerFooter() {
  const { status } = useAuth();
  const isCustomer = status === "customer";

  return (
    <footer className="shop-footer">
      <div className="shop-container shop-footer__grid">
        <div className="shop-footer__brand">
          <Logo light />
          <p>Fresh dairy and everyday essentials, delivered to your door.</p>
        </div>

        <nav aria-label="Shop" className="shop-footer__col">
          <h2>Shop</h2>
          <ul>
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/cart">Your cart</Link></li>
          </ul>
        </nav>

        <nav aria-label="Account" className="shop-footer__col">
          <h2>Account</h2>
          <ul>
            {isCustomer ? (
              <>
                <li><Link to="/orders">My orders</Link></li>
                <li><Link to="/account">My account</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/customer/login">Sign in</Link></li>
                <li><Link to="/customer/register">Create an account</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="shop-footer__col">
          <h2>Why Pure Pail</h2>
          <ul className="shop-footer__perks">
            <li><Leaf size={16} aria-hidden="true" /> Farm-fresh quality</li>
            <li><Truck size={16} aria-hidden="true" /> Cash on delivery</li>
            <li><ShieldCheck size={16} aria-hidden="true" /> Secure checkout</li>
          </ul>
        </div>
      </div>

      <div className="shop-footer__bar">
        <div className="shop-container">
          <p>© {new Date().getFullYear()} Pure Pail Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}