import { apiClient } from "./client";
export const inventoryApi = {
  list:    ()      => apiClient.get("/inventory"),
  status:  ()      => apiClient.get("/inventory/status"),
  getById: (id)    => apiClient.get(`/inventory/${id}`),
  create:  (p)     => apiClient.post("/inventory", p),
  update:  (id, p) => apiClient.put(`/inventory/${id}`, p),
  remove:  (id)    => apiClient.delete(`/inventory/${id}`),
};