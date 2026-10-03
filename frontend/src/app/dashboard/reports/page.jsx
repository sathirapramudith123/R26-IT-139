"use client";

// src/app/dashboard/reports/page.jsx

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import IncomeStatement from "@/components/reports/IncomeStatement";
import { reportApi } from "@/services/api/reports";
import { downloadIncomeStatementPdf } from "@/lib/reportPdf";

import { t } from "@/lib/i18n";
export default function ReportsPage() {
  useAuthGuard();
  const router = useRouter();
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
      setError(e.message || t("Failed to load report"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasData = data && Object.keys(data).length > 0;

  return (
    <div className="page-container">
      {/* Original layout — with a Back button on the right of the action group */}
      <PageHeader
        title={t("Income & Expense Statement")}
        description={t("Revenue, costs, and net profit.")}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!hasData} onClick={() => downloadIncomeStatementPdf(data)}>
              {t("⬇ PDF")}
            </Button>
            <Button variant="secondary" onClick={load}>
              {t("↻ Refresh")}
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("← Back")}
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner label={t("Loading report...")} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
          <div className="mt-3">
            <Button onClick={load}>{t("Try Again")}</Button>
          </div>
        </Card>
      ) : !hasData ? (
        <EmptyState
          icon="📊"
          title={t("No data yet")}
          description={t("No financial records for this period.")}
        />
      ) : (
        <IncomeStatement data={data} />
      )}
    </div>
  );
}
