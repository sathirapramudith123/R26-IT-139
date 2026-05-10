"use client";
import { useCallback, useState } from "react";
import { ledgerApi } from "@/services/api/ledger.api";

export default function useLedger() {
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null);
  const [paymentSplit,setPaymentSplit]=useState({}); const [loading,setLoading]=useState(false); const [error,setError]=useState(null);

  const fetchAll = useCallback(async()=>{
    setLoading(true); setError(null);
    try { const [l,s,p]=await Promise.all([ledgerApi.list(),ledgerApi.summary(),ledgerApi.paymentSplit()]);
      setItems(Array.isArray(l)?l:[]); setSummary(s); setPaymentSplit(p||{});
    } catch(e){setError(e.message||"Failed"); setItems([]); setSummary(null);}
    finally{setLoading(false);}
  },[]);

  return { items, summary, paymentSplit, loading, error, fetchAll };
}
