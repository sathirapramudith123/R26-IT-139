import { apiClient } from "./client";
export const ledgerApi = {
  list: () => apiClient.get("/ledger"),
  getById: (id) => apiClient.get(`/ledger/${id}`),
  create: (payload) => apiClient.post("/ledger", payload)
};
