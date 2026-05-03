import { apiClient } from "./client";

export const ledgerApi = {
  list: () => apiClient.get("/ledger"),

  getById: (id) => apiClient.get(`/ledger/${id}`),

  create: (payload) => apiClient.post("/ledger", payload),

  update: (id, payload) => apiClient.put(`/ledger/${id}`, payload),

  delete: (id) => apiClient.delete(`/ledger/${id}`),

  getSummary: () => apiClient.get("/ledger/summary"),

  getMonthlyReport: () => apiClient.get("/ledger/monthly-report"),

  getPaymentSplit: () => apiClient.get("/ledger/payment-split"),

  exportCsv: () => apiClient.get("/ledger/export/csv"),
};