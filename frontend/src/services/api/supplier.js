import { apiClient } from "./client";
export const supplierApi = {
  list: () => apiClient.get("/suppliers"),
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (p) => apiClient.post("/suppliers", p),
  update: (id, p) => apiClient.put(`/suppliers/${id}`, p),
  remove: (id) => apiClient.delete(`/suppliers/${id}`),
  // { payments_tracked, suppliers: [{ supplier_name, received, on_order, paid, outstanding }] }
  balances: () => apiClient.get("/suppliers/balances"),
};
