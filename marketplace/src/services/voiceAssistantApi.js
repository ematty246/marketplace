import api from "../api/axios";

// The browser talks only to Flask. GPT/OAuth credentials must remain server-side.
export async function sendAssistantMessage({ message, language, cart, page }) {
  const { data } = await api.post("/assistant/chat", {
    message,
    language,
    page,
    cart: (cart || []).map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      name: item.name,
    })),
  });
  return data;
}
