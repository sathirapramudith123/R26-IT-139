import { apiClient } from "./client";

const CACHE_KEY = "offline_cache_inventory";
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
  } catch {
    // storage quota exceeded — silently ignore
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export const inventoryApi = {
  /**
   * Fetch all inventory items.
   * Returns cached data immediately when offline, then refreshes on next online call.
   */
  list: async () => {
    try {
      const data = await apiClient.get("/inventory");
      writeCache(data);
      return data;
    } catch (err) {
      // Network failure — try cache
      const cached = readCache();
      if (cached) {
        console.warn("[inventory.api] Offline — returning cached data");
        return cached;
      }
      throw err;
    }
  },

  getById: (id) => apiClient.get(`/inventory/${id}`),

  create: async (payload) => {
    const result = await apiClient.post("/inventory", payload);
    clearCache(); // invalidate so next list() fetches fresh
    return result;
  },

  update: async (id, payload) => {
    const result = await apiClient.put(`/inventory/${id}`, payload);
    clearCache();
    return result;
  },

  remove: async (id) => {
    const result = await apiClient.delete(`/inventory/${id}`);
    clearCache();
    return result;
  },

  /** Manually clear the cache (e.g. after a sync) */
  clearCache,
};