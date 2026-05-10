"use client";
import { useCallback, useState } from "react";
import { notificationApi } from "@/services/api/notification.api";

export default function useNotifications() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState("");

  const fetchAll = useCallback(async()=>{
    try { setLoading(true); setError(""); const d=await notificationApi.list(); setItems(Array.isArray(d)?d:[]); }
    catch(e){setError(e.message||"Failed"); setItems([]);}
    finally{setLoading(false);}
  },[]);

  const markRead = useCallback(async(id)=>{ await notificationApi.markRead(id); await fetchAll(); },[fetchAll]);
  const deleteNotification = useCallback(async(id)=>{ await notificationApi.delete(id); await fetchAll(); },[fetchAll]);

  return { items, loading, error, fetchAll, markRead, deleteNotification };
}
