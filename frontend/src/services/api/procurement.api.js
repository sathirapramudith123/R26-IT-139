import { apiClient } from "./client";

export const procurementApi = {
  list: () => apiClient.get("/procurement"),

  getById: (id) => apiClient.get(`/procurement/${id}`),

  create: (payload) => apiClient.post("/procurement", payload),

  update: (id, payload) => apiClient.put(`/procurement/${id}`, payload),

  delete: (id) => apiClient.delete(`/procurement/${id}`),

  getRecommendations: () => apiClient.get("/procurement/recommendations"),
};