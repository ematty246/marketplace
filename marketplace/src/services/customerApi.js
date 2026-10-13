import api, { getErrorMessage } from "../api/axios";
import { toPaise } from "../utils/money";

export function friendlyError(err) {
  const msg = getErrorMessage(err);
  if (!err.response) return msg; // network / backend down
  const generic = msg.startsWith("Request failed");
  switch (err.response.status) {
    case 401: return generic ? "Please sign in to continue." : msg;
    case 403: return generic ? "You do not have permission to do that." : msg;
    case 404: return generic ? "We could not find what you asked for." : msg;
    case 409: return generic ? "Some items are unavailable or no longer in stock." : msg;
    default: return msg;
  }
}

export async function getProducts() {
  const { data } = await api.get("/products");
  return Array.isArray(data) ? data : data.products ?? [];
}

export async function registerCustomer({ full_name, email, password }) {
  const { data } = await api.post("/auth/register", { full_name, email, password });
  return data;
}

// Only product_id and quantity are sent. Prices and totals are calculated by the backend.

export async function placeOrder({ phone_number, shipping_address, items }) {
  const { data } = await api.post("/orders", {
    phone_number,
    payment_method: "COD",
    shipping_address,
    items,
  });
  return data;
}


export async function getMyOrders() {
  const { data } = await api.get("/orders/my");
  return Array.isArray(data) ? data : data.orders ?? [];
}

// The backend response shape can vary slightly; read the common field names defensively.
export function normalizeOrder(raw) {
  const o = raw?.order ?? raw ?? {};
  const items = (o.items ?? o.order_items ?? []).map((i) => {
    const quantity = Number(i.quantity) || 0;
    const unitPaise = toPaise(i.unit_price ?? i.price ?? i.price_at_purchase ?? 0);
    const sub = i.subtotal ?? i.line_total;
    return {
      productId: i.product_id ?? i.product?.id,
      name: i.product_name ?? i.name ?? i.product?.name ?? `Product #${i.product_id ?? "?"}`,
      unit: i.unit ?? i.product?.unit ?? "",
      quantity,
      unitPaise,
      subtotalPaise: sub != null ? toPaise(sub) : unitPaise * quantity,
    };
  });
  const total = o.total_amount ?? o.total ?? o.grand_total;
  return {
    id: o.id,
    number: o.order_number ?? o.order_no ?? o.id,
    createdAt: o.created_at ?? o.placed_at ?? o.date,
    totalPaise: total != null ? toPaise(total) : items.reduce((s, i) => s + i.subtotalPaise, 0),
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status ?? o.order_status,
    address: o.shipping_address ?? o.address,
    items,
  };
}

export function labelFor(value) {
  if (!value) return "—";
  const v = String(value);
  if (v.toUpperCase() === "COD") return "Cash on Delivery";
  return v.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
