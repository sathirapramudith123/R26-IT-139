import { apiClient } from "./client";

export const transactionApi = {
  // Get all transactions
  list: () => apiClient.get("/transactions"),

  // Get single transaction
  getById: (id) => apiClient.get(`/transactions/${id}`),

  // Create transaction
  create: (payload) =>
    apiClient.post("/transactions", normalizePayload(payload)),

  // Transaction history
  history: () => apiClient.get("/transactions/history"),

  // Update transaction (optional but recommended)
  update: (id, payload) =>
    apiClient.put(`/transactions/${id}`, normalizePayload(payload)),

  // Delete transaction (optional)
  delete: (id) => apiClient.delete(`/transactions/${id}`)
};