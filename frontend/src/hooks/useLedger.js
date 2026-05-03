"use client";

import { useCallback, useState } from "react";
import { ledgerApi } from "@/services/api/ledger.api";

export default function useLedger() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState({});
  const [paymentSplit, setPaymentSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ledgerData, summaryData, monthlyData, splitData] =
        await Promise.all([
          ledgerApi.list(),
          ledgerApi.getSummary(),
          ledgerApi.getMonthlyReport(),
          ledgerApi.getPaymentSplit(),
        ]);

      setItems(Array.isArray(ledgerData) ? ledgerData : []);
      setSummary(summaryData);
      setMonthlyReport(monthlyData || {});
      setPaymentSplit(splitData);
    } catch (err) {
      setError(err.message || "Failed to load ledger data");
      setItems([]);
      setSummary(null);
      setMonthlyReport({});
      setPaymentSplit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    summary,
    monthlyReport,
    paymentSplit,
    loading,
    error,
    fetchAll,
  };
}