import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="shell__main">
        <Header onMenu={() => setOpen(true)} />
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
