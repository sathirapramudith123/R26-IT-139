"use client";
import { useCallback, useState } from "react";
import { procurementApi } from "@/services/api/procurement";

export default function useProcurement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await procurementApi.list(); setItems(Array.isArray(d) ? d : []); }
    catch (e) { setError(e.message || "Failed to load procurement"); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, fetchAll };
}