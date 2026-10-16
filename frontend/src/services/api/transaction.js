import { apiClient } from "./client";

export const transactionApi = {
  list: () => apiClient.get("/transactions"),
  getById: (id) => apiClient.get(`/transactions/${id}`),
  create: (p) => apiClient.post("/transactions", p),
  update: (id, p) => apiClient.put(`/transactions/${id}`, p),
  remove: (id) => apiClient.delete(`/transactions/${id}`),
  journal: (params) => apiClient.get("/transactions/journal", { params }),
  // { "tea": { item_name, last_sale, batches } } — see lib/priceHints.js
  priceHints: () => apiClient.get("/transactions/price-hints"),
  // money in / out per Cash, Bank and Digital for { from, to } — see backend utils/paymentMethods.js
  paymentMethods: (params) => apiClient.get("/reports/payment-methods", { params }),
};
