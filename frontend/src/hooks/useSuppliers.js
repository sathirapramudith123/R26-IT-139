"use client";
import { useCallback, useState } from "react";
import { supplierApi } from "@/services/api/supplier";

export default function useSuppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await supplierApi.list(); setItems(Array.isArray(d) ? d : []); }
    catch (e) { setError(e.message || "Failed to load suppliers"); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, fetchAll };
}