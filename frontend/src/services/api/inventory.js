import { apiClient } from "./client";
export const inventoryApi = {
  list: () => apiClient.get("/inventory"),
  status: () => apiClient.get("/inventory/status"),
  getById: (id) => apiClient.get(`/inventory/${id}`),
  // purchases (batches), stock left per cost and units sold for one item
  insights: (id, from, to) =>
    apiClient.get(`/inventory/${id}/insights${from && to ? `?from=${from}&to=${to}` : ""}`),
  create: (p) => apiClient.post("/inventory", p),
  update: (id, p) => apiClient.put(`/inventory/${id}`, p),
  remove: (id) => apiClient.delete(`/inventory/${id}`),
};
