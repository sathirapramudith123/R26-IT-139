import { apiClient } from "./client";

export const insightsApi = {
  get: () => apiClient.get("/insights"),
};