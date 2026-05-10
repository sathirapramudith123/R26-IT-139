"use client";
import { useCallback, useState } from "react";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

export default function useAgencyBanking() {
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null);
  const [loading,setLoading]=useState(false); const [error,setError]=useState(null);

  const fetchAll = useCallback(async()=>{
    setLoading(true); setError(null);
    try { const [r,s]=await Promise.all([agencyBankingApi.list(),agencyBankingApi.getSummary()]);
      setItems(Array.isArray(r)?r:[]); setSummary(s);
    } catch(e){setError(e.message||"Failed"); setItems([]); setSummary(null);}
    finally{setLoading(false);}
  },[]);

  return { items, summary, loading, error, fetchAll };
}
