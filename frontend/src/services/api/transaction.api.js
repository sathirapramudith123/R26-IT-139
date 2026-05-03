import { apiClient } from "./client";

export const transactionApi = {
  list: () => apiClient.get("/transactions"),
  getById: (id) => apiClient.get(`/transactions/${id}`),
  create: (payload) => apiClient.post("/transactions", payload),
  history: () => apiClient.get("/transactions/history"),
};