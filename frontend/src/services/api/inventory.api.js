import { apiClient } from "./client";

export const inventoryApi = {
  list: () => apiClient.get("/inventory"),
  getById: (id) => apiClient.get(`/inventory/${id}`),
  create: (payload) => apiClient.post("/inventory", payload),
  update: (id, payload) => apiClient.put(`/inventory/${id}`, payload),
  remove: (id) => apiClient.delete(`/inventory/${id}`)
};