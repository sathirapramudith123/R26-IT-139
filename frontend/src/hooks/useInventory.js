"use client";
import { useCallback, useState } from "react";
import { inventoryApi } from "@/services/api/inventory";

export default function useInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await inventoryApi.list(); setItems(Array.isArray(d) ? d : []); }
    catch (e) { setError(e.message || "Failed to load inventory"); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, fetchAll };
}