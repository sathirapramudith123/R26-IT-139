import { apiClient } from "./client";

export const notificationApi = {
  list: () => apiClient.get("/notifications"),

  getById: (id) => apiClient.get(`/notifications/${id}`),

  create: (payload) => apiClient.post("/notifications", payload),

  update: (id, payload) => apiClient.put(`/notifications/${id}`, payload),

  markRead: (id) => apiClient.put(`/notifications/${id}/read`, {}),

  delete: (id) => apiClient.delete(`/notifications/${id}`),
};