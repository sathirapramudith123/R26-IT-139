import { apiClient } from "./client";

const CACHE_KEY = "offline_cache_suppliers";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export const supplierApi = {
  /**
   * Fetch all suppliers.
   * Falls back to localStorage cache when the API is unreachable.
   */
  list: async () => {
    try {
      const data = await apiClient.get("/suppliers");
      writeCache(data);
      return data;
    } catch (err) {
      const cached = readCache();
      if (cached) {
        console.warn("[supplier.api] Offline — returning cached data");
        return cached;
      }
      throw err;
    }
  },

  getById: (id) => apiClient.get(`/suppliers/${id}`),

  create: async (payload) => {
    const result = await apiClient.post("/suppliers", payload);
    clearCache();
    return result;
  },

  update: async (id, payload) => {
    const result = await apiClient.put(`/suppliers/${id}`, payload);
    clearCache();
    return result;
  },

  remove: async (id) => {
    const result = await apiClient.delete(`/suppliers/${id}`);
    clearCache();
    return result;
  },

  clearCache,
};