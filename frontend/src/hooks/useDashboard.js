"use client";
import { useCallback, useState } from "react";
import { dashboardApi } from "@/services/api/dashboard.api";

export default function useDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    try { setLoading(true); setError("");
      const d = await dashboardApi.summary();
      setSummary(d?.metrics||null);
      setRecentActivity(Array.isArray(d?.recent_activity)?d.recent_activity:[]);
    } catch(e) { setError(e.message||"Failed to load dashboard"); }
    finally { setLoading(false); }
  }, []);

  return { summary, recentActivity, loading, error, fetchSummary };
}
