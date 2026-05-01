import { apiClient } from "./client";
export const savingsApi = {
  list: () => apiClient.get("/savings"),
  getById: (id) => apiClient.get(`/savings/${id}`),
  create: (payload) => apiClient.post("/savings", payload)
};
