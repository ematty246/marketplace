
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Leaf,
  LogIn,
  Mic,
  ShieldCheck,
  ShoppingBasket,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";

import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../api/axios";

const EMAIL_KEY = "pp_admin_email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthBrand() {
  return (
    <section className="brand-panel" aria-label="Pure Pail marketplace">
      <Logo light />

      <div className="brand-panel__copy">
        <span className="brand-panel__eyebrow">
          YOUR MARKETPLACE. ONE DASHBOARD.
        </span>

        <h2>
          Everything your customers need.
          <span> Everything you manage.</span>
        </h2>

        <p>
          Manage your complete marketplace catalog, monitor inventory,
          and keep products organized in one convenient place.
        </p>

        <div className="brand-panel__features">
          <div className="brand-panel__feature">
            <span className="brand-panel__feature-icon">
              <ShoppingBasket size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Everyday essentials</strong>
              <span>Groceries, dairy, pantry and more</span>
            </div>
          </div>

          <div className="brand-panel__feature">
            <span className="brand-panel__feature-icon">
              <Leaf size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>One organized catalog</strong>
              <span>Manage products, prices and stock</span>
            </div>
          </div>

          <div className="brand-panel__feature">
            <span className="brand-panel__feature-icon">
              <Mic size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Accessible shopping</strong>
              <span>Designed for future voice navigation</span>
            </div>
          </div>

          <div className="brand-panel__feature">
            <span className="brand-panel__feature-icon">
              <Truck size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Smarter operations</strong>
              <span>Keep inventory ready for fulfilment</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="brand-panel__drop brand-panel__drop--a"
        aria-hidden="true"
      />
      <div
        className="brand-panel__drop brand-panel__drop--b"
        aria-hidden="true"
      />
    </section>
  );
}

export default function AdminLogin() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(
    () => localStorage.getItem(EMAIL_KEY) || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(
    () => Boolean(localStorage.getItem(EMAIL_KEY))
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Administrator Login | Pure Pail Marketplace";
  }, []);

  if (status === "authed") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const validate = () => {
    const nextErrors = {};

    if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!validate()) {
      return;
    }

    setBusy(true);

    try {
      // AuthContext must call POST /api/auth/login and reject
      // accounts whose role is not ADMIN.
      await login(email.trim(), password);

      if (rememberEmail) {
        localStorage.setItem(EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(EMAIL_KEY);
      }

      toast.success("Welcome to your marketplace dashboard.");

      const requestedPath = location.state?.from;
      const destination =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/admin") &&
        requestedPath !== "/admin/login" &&
        requestedPath !== "/admin/setup"
          ? requestedPath
          : "/admin/dashboard";

      navigate(destination, { replace: true });
    } catch (error) {
      const message =
        error.response?.status === 401
          ? "Incorrect email or password."
          : error.response?.status === 403
            ? "Administrator access is required."
            : getErrorMessage(error);

      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <AuthBrand />

      <main className="auth__panel">
        <div className="auth-mobile-logo">
          <Logo />
        </div>

        <form
          className="auth-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <span className="auth-card__badge">
            <ShieldCheck size={16} aria-hidden="true" />
            Secure administrator access
          </span>

          <div className="auth-card__heading">
            <p className="auth-card__eyebrow">PURE PAIL MARKETPLACE</p>
            <h1>Welcome back</h1>
            <p className="auth-card__sub">
              Sign in to manage your products, catalog and inventory.
            </p>
          </div>

          {formError && (
            <div className="alert alert--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="admin@example.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((previous) => ({
                  ...previous,
                  email: "",
                }));
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-err" : undefined}
              required
            />

            {errors.email && (
              <p className="field__error" id="email-err">
                {errors.email}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>

            <div className="input-group">
              <input
                id="password"
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    password: "",
                  }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "password-err" : undefined
                }
                required
              />

              <button
                type="button"
                className="input-group__btn"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="field__error" id="password-err">
                {errors.password}
              </p>
            )}
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) =>
                setRememberEmail(event.target.checked)
              }
            />
            <span>Remember my email on this device</span>
          </label>

          <button
            className="btn btn--primary btn--block"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} aria-hidden="true" />
                Sign in to dashboard
              </>
            )}
          </button>

       
          

          <p className="auth-card__security">
            <ShieldCheck size={15} aria-hidden="true" />
            Your administrator account is protected.
          </p>
        </form>

       
      </main>
    </div>
  );
}
