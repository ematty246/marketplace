import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Package, Search, ShoppingCart, User } from "lucide-react";
import Logo from "../Logo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";

export default function CustomerHeader() {
  const { user, status, logout } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [localQ, setLocalQ] = useState("");
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const onShop = pathname === "/shop";
  const q = onShop ? params.get("q") ?? "" : localQ;
  const isCustomer = status === "customer";
  const name = user?.full_name || user?.name || user?.email || "Account";

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const onChange = (value) => {
    if (onShop) {
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        value ? n.set("q", value) : n.delete("q");
        return n;
      }, { replace: true });
    } else setLocalQ(value);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!onShop) navigate(`/shop${localQ.trim() ? `?q=${encodeURIComponent(localQ.trim())}` : ""}`);
  };

  return (
    <header className="shop-header">
      <div className="shop-header__inner">
        <Link to="/shop" className="shop-brand" aria-label="Pure Pail Marketplace home"><Logo /></Link>
        <nav className="shop-nav" aria-label="Main">
          <NavLink to="/shop" className={({ isActive }) => (isActive ? "on" : "")}>Shop</NavLink>
          {isCustomer && <NavLink to="/orders" className={({ isActive }) => (isActive ? "on" : "")}>My orders</NavLink>}
        </nav>
        <form className="shop-search" role="search" onSubmit={submit}>
          <Search size={17} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => onChange(e.target.value)} placeholder="Search milk, paneer, ghee…" aria-label="Search products" />
        </form>
        <Link to="/cart" className="shop-cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
          <ShoppingCart size={22} />
          {count > 0 && <span className="shop-cart__count">{count > 99 ? "99+" : count}</span>}
        </Link>
        {isCustomer ? (
          <div className="profile" ref={ref}>
            <button className="profile__btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <span className="avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
              <span className="profile__who"><strong>{name}</strong><small>Customer</small></span>
            </button>
            {menu && (
              <div className="menu menu--right" role="menu">
                <Link role="menuitem" to="/orders" onClick={() => setMenu(false)}><Package size={16} /> My orders</Link>
                <Link role="menuitem" to="/account" onClick={() => setMenu(false)}><User size={16} /> My account</Link>
                <button role="menuitem" onClick={() => { setMenu(false); logout(); navigate("/shop"); }}><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/customer/login" className="btn btn--secondary btn--sm shop-login">Log in</Link>
        )}
      </div>
    </header>
  );
}
