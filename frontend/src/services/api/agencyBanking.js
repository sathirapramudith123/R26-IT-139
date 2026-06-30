import { apiClient } from "./client";
export const agencyBankingApi = {
  list:    ()      => apiClient.get("/agency-banking"),
  getById: (id)    => apiClient.get(`/agency-banking/${id}`),
  create:  (p)     => apiClient.post("/agency-banking", p),
  update:  (id, p) => apiClient.put(`/agency-banking/${id}`, p),
  remove:  (id)    => apiClient.delete(`/agency-banking/${id}`),
};