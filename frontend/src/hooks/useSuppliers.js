"use client";
import { useCallback, useState } from "react";
import { supplierApi } from "@/services/api/supplier.api";

export default function useSuppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null); setIsOffline(false);
    try { const d=await supplierApi.list(); setItems(Array.isArray(d)?d:[]); if(!navigator.onLine) setIsOffline(true); }
    catch(e) { setError(e.message||"Failed to load suppliers"); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, isOffline, fetchAll };
}
