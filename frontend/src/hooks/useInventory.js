"use client";

import { useState, useCallback } from "react";
import { inventoryApi } from "@/services/api/inventory.api";

export default function useInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const data = await inventoryApi.list();
      setItems(Array.isArray(data) ? data : []);

      // If navigator says we're offline but we got data, it came from cache
      if (!navigator.onLine) {
        setIsOffline(true);
      }
    } catch (err) {
      setError(err.message || "Failed to load inventory");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    loading,
    error,
    isOffline,
    fetchAll,
  };
}