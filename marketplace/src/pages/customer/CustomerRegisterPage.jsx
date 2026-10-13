import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import Logo from "../../components/Logo.jsx";
import CustomerAuthBrand from "../../components/customer/CustomerAuthBrand.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { friendlyError, registerCustomer } from "../../services/customerApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerRegisterPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Create account | Pure Pail Marketplace";
  }, []);

  if (status === "customer") return <Navigate to="/shop" replace />;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setFormError("");

    const next = {};
    if (form.full_name.trim().length < 2) next.full_name = "Enter your full name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await registerCustomer({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      toast.success("Account created. Please sign in.");
      navigate("/customer/login", { replace: true, state: { registered: true } });
    } catch (error) {
      const message = friendlyError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (
    <button type="button" className="input-group__btn" onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );

  return (
    <div className="auth">
      <CustomerAuthBrand />

      <main className="auth__panel">
        <div className="auth-mobile-logo"><Logo /></div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <span className="auth-card__badge">
            <ShieldCheck size={16} aria-hidden="true" />
            Secure customer sign up
          </span>

          <div className="auth-card__heading">
            <p className="auth-card__eyebrow">PURE PAIL MARKETPLACE</p>
            <h1>Create your account</h1>
            <p className="auth-card__sub">Shop fresh essentials and track your orders.</p>
          </div>

          {formError && (
            <div className="alert alert--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input id="full_name" className="input" type="text" placeholder="Your full name" autoComplete="name" value={form.full_name} onChange={set("full_name")} aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? "full_name-err" : undefined} required />
            {errors.full_name && <p className="field__error" id="full_name-err">{errors.full_name}</p>}
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" className="input" type="email" placeholder="customer@example.com" autoComplete="email" autoCapitalize="none" spellCheck="false" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-err" : undefined} required />
            {errors.email && <p className="field__error" id="email-err">{errors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-group">
              <input id="password" className="input" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-err" : undefined} required />
              {toggle}
            </div>
            {errors.password && <p className="field__error" id="password-err">{errors.password}</p>}
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" className="input" type={showPassword ? "text" : "password"} placeholder="Re-enter your password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? "confirm-err" : undefined} required />
            {errors.confirm && <p className="field__error" id="confirm-err">{errors.confirm}</p>}
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? (
              <><span className="auth-spinner" aria-hidden="true" /> Creating account...</>
            ) : (
              <><UserPlus size={18} aria-hidden="true" /> Create account</>
            )}
          </button>

          <p className="auth-card__foot">
            Already have an account? <Link to="/customer/login">Sign in</Link>
          </p>
         
        </form>
      </main>
    </div>
  );
}