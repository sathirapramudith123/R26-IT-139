"use client";
import { useState, useCallback } from "react";
import { savingsApi } from "@/services/api/savings.api";

export default function useSavings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await savingsApi.list(); setItems(Array.isArray(d) ? d : []); }
    catch (err) { setError(err.message); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, fetchAll };
}
