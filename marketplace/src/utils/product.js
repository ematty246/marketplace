const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
export const formatINR = (v) => inr.format(Number(v) || 0);

export const productImage = (p) => p?.image_url || p?.image || p?.image_path || null;

export function getStatus(p) {
  if (Number(p.stock_quantity) === 0) return { key: "out", label: "Out of stock" };
  if (p.is_available !== true) return { key: "hidden", label: "Unavailable" };
  return { key: "ok", label: "Available" };
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImage(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
  return "";
}

export function validateProduct(v, image) {
  const e = {};
  const name = v.name.trim();
  if (!name) e.name = "Enter a product name.";
  else if (name.length > 120) e.name = "Name must be 120 characters or fewer.";
  const category = v.category.trim();
  if (!category) e.category = "Enter a category.";
  else if (category.length > 80) e.category = "Category must be 80 characters or fewer.";
  if (v.description.length > 5000) e.description = "Description must be 5,000 characters or fewer.";
  const unit = v.unit.trim();
  if (!unit) e.unit = "Enter a unit, such as litre or 500 g.";
  else if (unit.length > 30) e.unit = "Unit must be 30 characters or fewer.";
  if (!/^\d+(\.\d{1,2})?$/.test(String(v.price).trim())) e.price = "Enter a price like 49 or 49.50 (up to two decimals).";
  if (!/^\d+$/.test(String(v.stock_quantity).trim())) e.stock_quantity = "Enter a whole number, 0 or more.";
  const imgErr = validateImage(image);
  if (imgErr) e.image = imgErr;
  return e;
}

export function buildFormData(v, image) {
  const fd = new FormData();
  fd.append("name", v.name.trim());
  fd.append("category", v.category.trim());
  fd.append("description", v.description.trim());
  fd.append("price", String(v.price).trim());
  fd.append("stock_quantity", String(v.stock_quantity).trim());
  fd.append("unit", v.unit.trim());
  fd.append("is_available", String(v.is_available));
  if (image) fd.append("image", image);
  return fd;
}
