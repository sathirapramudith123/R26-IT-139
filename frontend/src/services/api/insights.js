import { apiClient } from "./client";

export const insightsApi = {
  get: () => apiClient.get("/insights"),
  getSalesSummary: () => apiClient.get("/insights/sales-summary"),
  getProcurementSummary: () => apiClient.get("/insights/procurement-summary"),
};