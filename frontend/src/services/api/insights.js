import { apiClient } from "./client";

export const insightsApi = {
  get: () => apiClient.get("/insights"),
  getSalesSummary: () => apiClient.get("/insights/sales-summary"),
  getProcurementSummary: () => apiClient.get("/insights/procurement-summary"),
  // credit score with some of the shop's numbers changed → { base, scenario, delta }
  creditWhatIf: (changes) => apiClient.post("/insights/credit/what-if", { changes }),
  // realistic improvements, each scored by the model → { score, status, actions: [...] }
  creditActions: () => apiClient.get("/insights/credit/actions"),
};
