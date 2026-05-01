import { apiClient } from "./client";

export const supplierApi = {
  list: () => apiClient.get("/suppliers"),
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (payload) => apiClient.post("/suppliers", payload),
  update: (id, payload) => apiClient.put(`/suppliers/${id}`, payload),
  remove: (id) => apiClient.delete(`/suppliers/${id}`)
};