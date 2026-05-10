import { apiClient } from "./client";
export const notificationApi = {
  list: ()=>apiClient.get("/notifications"),
  getById: (id)=>apiClient.get(`/notifications/${id}`),
  create: (p)=>apiClient.post("/notifications",p),
  update: (id,p)=>apiClient.put(`/notifications/${id}`,p),
  markRead: (id)=>apiClient.put(`/notifications/${id}/read`,{}),
  delete: (id)=>apiClient.delete(`/notifications/${id}`),
};
