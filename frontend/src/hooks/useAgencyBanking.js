"use client";
import { useCallback, useState } from "react";
import { agencyBankingApi } from "@/services/api/agencyBanking";

export default function useAgencyBanking() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await agencyBankingApi.list();
      const list = Array.isArray(r) ? r : [];
      setItems(list);
      setSummary({
        total_transactions: list.length,
        total_amount:       list.reduce((s,i)=>s+(Number(i.amount)||0),0),
        total_service_fees: list.reduce((s,i)=>s+(Number(i.service_fee)||0),0),
        total_commission:   list.reduce((s,i)=>s+(Number(i.commission)||0),0),
      });
    } catch (e) { setError(e.message || "Failed"); setItems([]); setSummary(null); }
    finally { setLoading(false); }
  }, []);

  return { items, summary, loading, error, fetchAll };
}