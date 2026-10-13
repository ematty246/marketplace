// All money is handled as integer paise to avoid floating-point drift.
export const toPaise = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
export const formatPaise = (paise) => fmt.format((paise || 0) / 100);
