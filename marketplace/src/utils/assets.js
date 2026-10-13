// Flask returns relative image paths (e.g. /uploads/milk.jpg). They must point at Flask, not the React dev server.
// In dev the Vite proxy forwards /uploads and /static to Flask. If you do not use the proxy,
// set VITE_ASSET_BASE_URL=http://127.0.0.1:5000 in .env.
const BASE = (import.meta.env.VITE_ASSET_BASE_URL || "").replace(/\/$/, "");

export function assetUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${BASE}${url.startsWith("/") ? url : `/${url}`}`;
}
