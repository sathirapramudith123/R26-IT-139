import { apiClient } from "./client";

export const agencyBankingApi = {
  list: () => apiClient.get("/agency-banking"),

  getById: (id) => apiClient.get(`/agency-banking/${id}`),

  create: (payload) => apiClient.post("/agency-banking", payload),

  update: (id, payload) => apiClient.put(`/agency-banking/${id}`, payload),

  delete: (id) => apiClient.delete(`/agency-banking/${id}`),

  getSummary: () => apiClient.get("/agency-banking/summary"),
};