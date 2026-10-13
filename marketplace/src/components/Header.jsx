import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const initials = (user?.name || user?.email || "A").trim().slice(0, 2).toUpperCase();

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

  const search = (e) => {
    e.preventDefault();
    navigate(`/admin/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <header className="topbar">
      <button className="icon-btn topbar__menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <form className="topbar__search" role="search" onSubmit={search}>
        <Search size={17} aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" />
      </form>
      <div className="profile" ref={ref}>
        <button className="profile__btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <span className="avatar" aria-hidden="true">{initials}</span>
          <span className="profile__who">
            <strong>{user?.name || user?.email}</strong>
            <small>Administrator</small>
          </span>
        </button>
        {menu && (
          <div className="menu menu--right" role="menu">
            <div className="menu__info">{user?.email}</div>
            <button role="menuitem" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}