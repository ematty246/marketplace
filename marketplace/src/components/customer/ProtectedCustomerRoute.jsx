import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedCustomerRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") {
    return (
      <div className="boot" role="status" aria-live="polite">
        <div className="boot__dot" />
        <span>Checking your session…</span>
      </div>
    );
  }
  if (status !== "customer") return <Navigate to="/customer/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
