// src/app/dashboard/reports/page.jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import IncomeStatement from "@/components/reports/IncomeStatement";
import { reportApi } from "@/services/api/reports";
import { downloadIncomeStatementPdf } from "@/lib/reportPdf";

export default function ReportsPage() {
  useAuthGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.getIncomeStatement();
      setData(res);
    } catch (e) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasData = data && Object.keys(data).length > 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Income & Expense Statement"
        description="Revenue, costs, and net profit."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!hasData}
              onClick={() => downloadIncomeStatementPdf(data)}
            >
              ⬇ PDF
            </Button>
            <Button variant="secondary" onClick={load}>↻ Refresh</Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading report..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
          <div className="mt-3">
            <Button onClick={load}>Try Again</Button>
          </div>
        </Card>
      ) : !hasData ? (
        <EmptyState
          icon="📊"
          title="No data yet"
          description="No financial records for this period."
        />
      ) : (
        <IncomeStatement data={data} />
      )}
    </div>
  );
}