import { apiClient } from "./client";

// Dummy bank (simulated) customer accounts behind agency banking
export const bankAccountApi = {
  list: (agentBankId) => apiClient.get(`/bank-accounts${agentBankId ? `?agent_bank_id=${agentBankId}` : ""}`),
  lookup: (agentBankId, accountNumber) =>
    apiClient.get(
      `/bank-accounts/lookup?agent_bank_id=${encodeURIComponent(agentBankId)}&account_number=${encodeURIComponent(accountNumber)}`,
    ),
  statement: (id) => apiClient.get(`/bank-accounts/${id}/statement`),
  messages: (accountId) =>
    apiClient.get(`/bank-accounts/messages${accountId ? `?account_id=${accountId}` : ""}`),
  sendOtp: (id, amount) => apiClient.post(`/bank-accounts/${id}/otp`, { amount }),
  balanceInquiry: (id) => apiClient.post(`/bank-accounts/${id}/balance-inquiry`, {}),
};
