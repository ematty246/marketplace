import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "My account · Pure Pail Marketplace";
  }, []);

  return (
    <div className="shop-container shop-section shop-narrow">
      <h1 className="page__title">My account</h1>
      <section className="card">
        <div className="shop-account">
          <span className="avatar shop-account__avatar" aria-hidden="true">{(user?.full_name || user?.name || user?.email || "?").slice(0, 2).toUpperCase()}</span>
          <dl>
            <div><dt>Name</dt><dd>{user?.full_name || user?.name || "—"}</dd></div>
            <div><dt>Email</dt><dd>{user?.email || "—"}</dd></div>
            <div><dt>Account type</dt><dd>Customer</dd></div>
          </dl>
        </div>
        <div className="shop-actions">
          <Link to="/orders" className="btn btn--secondary"><Package size={16} /> My orders</Link>
          <button className="btn btn--secondary" onClick={async () => { await logout(); navigate("/shop"); }}><LogOut size={16} /> Log out</button>
        </div>
      </section>
    </div>
  );
}
