import { apiClient } from "./client";
export const procurementApi = {
  list: ()=>apiClient.get("/procurement"),
  getById: (id)=>apiClient.get(`/procurement/${id}`),
  create: (p)=>apiClient.post("/procurement",p),
  update: (id,p)=>apiClient.put(`/procurement/${id}`,p),
  remove: (id)=>apiClient.delete(`/procurement/${id}`),
  recommend: (p)=>apiClient.post("/procurement/recommend",p),
};
