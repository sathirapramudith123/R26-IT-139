import { apiClient } from "./client";
export const termVaultApi = {
  list: () => apiClient.get("/term-vault"),
  getById: (id) => apiClient.get(`/term-vault/${id}`),
  create: (payload) => apiClient.post("/term-vault", payload)
};
