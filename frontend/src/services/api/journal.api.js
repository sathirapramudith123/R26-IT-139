import { apiClient } from "./client";
export const journalApi = {
  list: ()=>apiClient.get("/journal"),
  trialBalance: ()=>apiClient.get("/journal/trial-balance"),
  accounts: ()=>apiClient.get("/journal/accounts"),
  byTransaction: (id)=>apiClient.get(`/journal/transaction/${id}`),
};
