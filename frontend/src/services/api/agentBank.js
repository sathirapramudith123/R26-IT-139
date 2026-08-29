import { apiClient } from "./client";

export const agentBankApi = {
  list:    ()           => apiClient.get("/agent-banks"),
  getById: (id)         => apiClient.get(`/agent-banks/${id}`),
  create:  (p)          => apiClient.post("/agent-banks", p),
  update:  (id, p)      => apiClient.put(`/agent-banks/${id}`, p),
  remove:  (id)         => apiClient.delete(`/agent-banks/${id}`),
  topup:   (id, amount) => apiClient.post(`/agent-banks/${id}/topup`, { amount }),
  ledger:  (id)         => apiClient.get(`/agent-banks/${id}/ledger`),
};