"use client";

import { useCallback, useState } from "react";
import { dashboardApi } from "@/services/api/dashboard.api";

export default function useDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await dashboardApi.summary();

      setSummary(data?.metrics || null);
      setRecentActivity(Array.isArray(data?.recent_activity) ? data.recent_activity : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
      setSummary(null);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summary,
    recentActivity,
    loading,
    error,
    fetchSummary,
  };
}