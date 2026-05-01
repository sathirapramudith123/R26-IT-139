"use client";
import { useState, useCallback } from "react";
import { transactionApi } from "@/services/api/transaction.api";

export default function useTransactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await transactionApi.list(); setItems(Array.isArray(d) ? d : []); }
    catch (err) { setError(err.message); setItems([]); }
    finally { setLoading(false); }
  }, []);

  return { items, loading, error, fetchAll };
}
