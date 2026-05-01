import { apiClient } from "./client";
export const notificationApi = {
  list: () => apiClient.get("/notifications")
};
