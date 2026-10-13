import api, { csrfHeaders, refreshAccessToken } from "../api/axios";

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data; // { access_token, user }
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data.user ?? data;
}

export async function adminCheck() {
  const { data } = await api.get("/auth/admin-check");
  return data;
}

export const refresh = refreshAccessToken;

export async function logout() {
  await api.post("/auth/logout", null, { headers: csrfHeaders() });
}
