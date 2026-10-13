import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

// Access token lives only in module memory (never localStorage / sessionStorage).
let accessToken = null;
let onAuthFailure = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const setAuthFailureHandler = (fn) => {
  onAuthFailure = fn;
};

function readCookie(name) {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

// Only the non-HttpOnly CSRF cookie is read. The HttpOnly refresh token is never touched.
export function csrfHeaders() {
  const csrf = readCookie("csrf_refresh_token");
  return csrf ? { "X-CSRF-TOKEN": csrf } : {};
}

const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise = null;

// Simultaneous callers share one in-flight refresh request.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, null, { withCredentials: true, headers: csrfHeaders() })
      .then((res) => {
        accessToken = res.data.access_token;
        return res.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/setup-admin"];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || NO_REFRESH.some((p) => original.url?.includes(p));
    if (status !== 401 || original._retry || skip) return Promise.reject(error);

    original._retry = true; // retry the original request only once
    try {
      await refreshAccessToken();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      accessToken = null;
      onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

export function getErrorMessage(err) {
  if (!err.response) {
    return err.request
      ? "Cannot reach the server. Check that the Flask backend is running."
      : err.message || "Something went wrong.";
  }
  const data = err.response.data;
  if (typeof data === "string" && data.length < 200) return data;
  if (data?.message) return data.message;
  if (typeof data?.error === "string") return data.error;
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" ");
  }
  if (err.response.status === 403) return "You do not have permission to perform this action.";
  return `Request failed (${err.response.status}).`;
}

export default api;
