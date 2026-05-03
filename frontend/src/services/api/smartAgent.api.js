import { apiClient } from "./client";

export const smartAgentApi = {
  list: () => apiClient.get("/smart-agent"),
  getById: (id) => apiClient.get(`/smart-agent/${id}`),
  create: (payload) => apiClient.post("/smart-agent", payload),
};