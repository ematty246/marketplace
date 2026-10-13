import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import Logo from "../../components/Logo.jsx";
import CustomerAuthBrand from "../../components/customer/CustomerAuthBrand.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { friendlyError } from "../../services/customerApi";

const EMAIL_KEY = "pp_customer_email"; // only the email address is ever remembered
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerLoginPage() {
  const { customerLogin, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(localStorage.getItem(EMAIL_KEY)));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;
  const destination =
    typeof from === "string" && from.startsWith("/") && !from.includes("/login") && !from.startsWith("/admin") ? from : "/shop";

  useEffect(() => {
    document.title = "Sign in | Pure Pail Marketplace";
  }, []);

  if (status === "customer") return <Navigate to={destination} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setFormError("");

    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await customerLogin(email.trim(), password);
      if (rememberEmail) localStorage.setItem(EMAIL_KEY, email.trim());
      else localStorage.removeItem(EMAIL_KEY);
      toast.success("Welcome back.");
      navigate(destination, { replace: true });
    } catch (error) {
      const message = error.response?.status === 401 ? "Incorrect email or password." : friendlyError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <CustomerAuthBrand />

      <main className="auth__panel">
        <div className="auth-mobile-logo"><Logo /></div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <span className="auth-card__badge">
            <ShieldCheck size={16} aria-hidden="true" />
            Secure customer sign in
          </span>

          <div className="auth-card__heading">
            <p className="auth-card__eyebrow">PURE PAIL MARKETPLACE</p>
            <h1>Welcome back</h1>
            <p className="auth-card__sub">Sign in to checkout and track your orders.</p>
          </div>

          {location.state?.registered && !formError && (
            <div className="alert alert--ok" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>Account created. Sign in to continue.</span>
            </div>
          )}
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
              placeholder="customer@example.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-err" : undefined}
              required
            />
            {errors.email && <p className="field__error" id="email-err">{errors.email}</p>}
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
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-err" : undefined}
                required
              />
              <button type="button" className="input-group__btn" onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="field__error" id="password-err">{errors.password}</p>}
          </div>

          <label className="check">
            <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} />
            <span>Remember my email on this device</span>
          </label>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? (
              <><span className="auth-spinner" aria-hidden="true" /> Signing in...</>
            ) : (
              <><LogIn size={18} aria-hidden="true" /> Sign in</>
            )}
          </button>

          <p className="auth-card__foot">
            New to Pure Pail? <Link to="/customer/register">Create an account</Link>
          </p>
         
        </form>
      </main>
    </div>
  );
}