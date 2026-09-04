import { apiClient } from "./client";

export const transactionApi = {
  list:    ()      => apiClient.get("/transactions"),
  getById: (id)    => apiClient.get(`/transactions/${id}`),
  create:  (p)     => apiClient.post("/transactions", p),
  update:  (id, p) => apiClient.put(`/transactions/${id}`, p),
  remove:  (id)    => apiClient.delete(`/transactions/${id}`),
  journal: (params) => apiClient.get("/transactions/journal", { params }),
};