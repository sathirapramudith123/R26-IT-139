"use client";
import { useCallback, useState } from "react";
import { journalApi } from "@/services/api/journal.api";

export default function useJournal() {
  const [entries,setEntries]=useState([]); const [trialBalance,setTrialBalance]=useState(null);
  const [accounts,setAccounts]=useState({}); const [loading,setLoading]=useState(false); const [error,setError]=useState(null);

  const fetchAll = useCallback(async()=>{
    setLoading(true); setError(null);
    try { const [e,t,a]=await Promise.all([journalApi.list(),journalApi.trialBalance(),journalApi.accounts()]);
      setEntries(Array.isArray(e)?e:[]); setTrialBalance(t); setAccounts(a||{});
    } catch(e){setError(e.message||"Failed");}
    finally{setLoading(false);}
  },[]);

  return { entries, trialBalance, accounts, loading, error, fetchAll };
}
