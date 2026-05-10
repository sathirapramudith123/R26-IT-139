"use client";

import { useCallback, useState } from "react";
import {
  transactionApi,
  getCachedTransactions,
  setCachedTransactions,
  clearTransactionCache,
} from "@/services/api/transaction.api";

/**
 * Default hook — used by TransactionsPage, TransactionHistoryPage, etc.
 */
export default function useTransactions() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      const data = await transactionApi.list();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      setCachedTransactions(list);
    } catch (err) {
      // Fall back to cache when offline
      const cached = getCachedTransactions();
      if (cached) {
        setItems(cached);
        setIsOffline(true);
      } else {
        setError(err.message || "Failed to load transactions");
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, error, isOffline, fetchAll };
}


/**
 * Named export for the summary hook (used by reports page).
 */
export function useSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, error, fetchSummary };
}


/**
 * Named export for the reports hook.
 */
export function useReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionApi.getReports();
      setReports(data);
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  return { reports, loading, error, fetchReports };
}
