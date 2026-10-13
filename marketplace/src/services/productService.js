import api from "../api/axios";

export async function getAdminProducts() {
  const { data } = await api.get("/products/admin/all");
  return data; // { products, total }
}

// FormData is passed as-is; the browser/Axios add the multipart boundary.
export async function createProduct(formData) {
  const { data } = await api.post("/products", formData);
  return data;
}

export async function updateProduct(id, formData) {
  const { data } = await api.put(`/products/${id}`, formData);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data;
}
