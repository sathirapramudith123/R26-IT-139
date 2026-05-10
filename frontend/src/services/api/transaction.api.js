import { apiClient } from "./client";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const transactionApi = {
  // ── CRUD ────────────────────────────────────────────────────────────────
  list:     ()          => apiClient.get("/transactions"),
  getById:  (id)        => apiClient.get(`/transactions/${id}`),
  create:   (payload)   => apiClient.post("/transactions", payload),
  update:   (id, data)  => apiClient.put(`/transactions/${id}`, data),
  remove:   (id)        => apiClient.delete(`/transactions/${id}`),

  // ── Reports / journal ────────────────────────────────────────────────────
  getSummary: ()        => apiClient.get("/transactions/summary"),
  getReports: ()        => apiClient.get("/transactions/reports"),
  getJournal: ()        => apiClient.get("/transactions/journal"),

  // ── PDF export — direct URL for <a href> download ────────────────────────
  exportPdfUrl: ()      => `${BASE}/transactions/export/pdf`,
};


// ── Offline localStorage cache ────────────────────────────────────────────────
// Used by TransactionsPage and useTransactions hook as a fallback when
// the network is unavailable.

const CACHE_KEY = "ll_transactions_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedTransactions() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedTransactions(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function clearTransactionCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}
