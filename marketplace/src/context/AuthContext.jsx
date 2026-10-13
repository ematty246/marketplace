import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService";
import { setAccessToken, setAuthFailureHandler } from "../api/axios";

const AuthContext = createContext(null);

// Backend role name for shoppers. Change this one constant if your Flask roles differ.
const CUSTOMER_ROLE = "CUSTOMER";

// status values:
//   "loading" | "anon"
//   "authed"   -> signed-in ADMIN (unchanged meaning, so admin guards/pages keep working)
//   "customer" -> signed-in CUSTOMER
const statusFor = (u) =>
  u?.role === "ADMIN" ? "authed" : String(u?.role || "").toUpperCase() === CUSTOMER_ROLE ? "customer" : "anon";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | anon | authed (admin) | customer

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("anon");
  }, []);

  // Restore a session from the backend-managed refresh cookie.
  useEffect(() => {
    setAuthFailureHandler(clear);
    let cancelled = false;
    (async () => {
      try {
        await authService.refresh();
        const me = await authService.fetchMe();
        const next = statusFor(me);
        if (next === "anon") throw new Error("Unsupported role");
        if (!cancelled) {
          setUser(me);
          setStatus(next);
        }
      } catch {
        if (!cancelled) clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  // Admin login (unchanged behaviour): rejects non-admin accounts.
  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    if (data?.user?.role !== "ADMIN") {
      setAccessToken(data?.access_token ?? null);
      try {
        await authService.logout(); // revoke the customer session we just opened
      } catch {
        /* ignore */
      }
      setAccessToken(null);
      throw new Error("This account is a customer account and cannot access the admin panel.");
    }
    setAccessToken(data.access_token);
    setUser(data.user);
    setStatus("authed");
    return data.user;
  }, []);

  // Customer login: rejects admin accounts.
  const customerLogin = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    const next = statusFor(data?.user);
    if (next !== "customer") {
      setAccessToken(data?.access_token ?? null);
      try {
        await authService.logout(); // revoke the session we just opened
      } catch {
        /* ignore */
      }
      setAccessToken(null);
      throw new Error(
        next === "authed"
          ? "This is an administrator account. Please use the administrator login."
          : "This account cannot be used for shopping."
      );
    }
    setAccessToken(data.access_token);
    setUser(data.user);
    setStatus("customer");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* session is cleared locally regardless */
    }
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({ user, status, login, customerLogin, logout }),
    [user, status, login, customerLogin, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}