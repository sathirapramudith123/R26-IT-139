import { apiClient } from "./client";

export const notificationApi = {
  list:        ()   => apiClient.get("/notifications"),
  unreadCount: ()   => apiClient.get("/notifications/unread-count"),
  markRead:    (id) => apiClient.put(`/notifications/${id}/read`, {}),
  markAllRead: ()   => apiClient.put("/notifications/read-all", {}),
  remove:      (id) => apiClient.delete(`/notifications/${id}`),
};