import { NavLink } from "react-router-dom";
import { Boxes, ClipboardList, LayoutDashboard, LogOut, PlusCircle, Store, X } from "lucide-react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Product Catalog", icon: Store, end: true },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/products/new", label: "Add Product", icon: PlusCircle },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar${open ? " sidebar--open" : ""}`} aria-label="Primary">
        <div className="sidebar__top">
          <Logo light />
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar__nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="nav-link nav-link--logout" onClick={logout}>
          <LogOut size={19} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}