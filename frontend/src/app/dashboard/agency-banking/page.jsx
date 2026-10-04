"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { formatCurrency, titleCase } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

import { t } from "@/lib/i18n";
const COLS = [
  {
    key: "customer_name",
    get label() {
      return t("Customer");
    },
  },
  {
    key: "transaction_type",
    get label() {
      return t("Type");
    },
  },
  {
    key: "amount",
    get label() {
      return t("Amount");
    },
  },
  {
    key: "commission",
    get label() {
      return t("Commission");
    },
  },
  {
    key: "status",
    get label() {
      return t("Status");
    },
  },
  { key: "actions", label: "" },
];

/* Count-up: eases a number 0 -> target over `duration` ms (easeOutCubic). */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) {
      setVal(0);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* Animated stat value — money=true formats as currency, else plain integer. */
function CountStat({ value, money, className = "" }) {
  const v = useCountUp(value);
  const shown = money ? formatCurrency(Math.round(v)) : Math.round(v).toLocaleString();
  return <span className={className}>{shown}</span>;
}

export default function AgencyBankingPage() {
  useAuthGuard();
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await agencyBankingApi.remove(id);
      await fetchAll();
    } catch (e) {
      alert(e.message || t("Failed"));
    }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw
      ? items
      : items.filter((i) =>
          [i.customer_name, i.customer_phone, i.transaction_type].join(" ").toLowerCase().includes(kw),
        );
  }, [items, search]);

  const rows = filtered.map((item) => ({
    ...item,
    transaction_type: t(titleCase(item.transaction_type || "")),
    amount: formatCurrency(item.amount),
    commission: formatCurrency(item.commission),
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>
          {t("View")}
        </Button>
        <Link href={`/dashboard/agency-banking/${item.id}/edit`}>
          <Button variant="secondary" size="sm">
            {t("Edit")}
          </Button>
        </Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
          {t("Delete")}
        </Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title={t("Agency Banking")}
        description={t("Customer banking transactions and commission.")}
        action={
          <Link href="/dashboard/agency-banking/create">
            <Button>{t("+ New Transaction")}</Button>
          </Link>
        }
      />
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            [t("Transactions"), summary.total_transactions, "text-slate-800 dark:text-slate-100", false],
            [t("Volume"), summary.total_amount, "text-slate-800 dark:text-slate-100", true],
            [t("Service Fees"), summary.total_service_fees, "text-blue-600 dark:text-blue-400", true],
            [t("Commission"), summary.total_commission, "text-emerald-600 dark:text-emerald-400", true],
          ].map(([l, v, c, money]) => (
            <Card key={l}>
              <p className="text-xs font-medium text-slate-400">{l}</p>
              <p className={`mt-1 text-xl font-bold ${c}`}>
                <CountStat value={v} money={money} />
              </p>
            </Card>
          ))}
        </div>
      )}
      <Card className="mb-4">
        <input
          type="text"
          placeholder={t("Search by customer, phone, type...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </Card>
      {loading ? (
        <LoadingSpinner label={t("Loading transactions...")} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🏦"
          title={t("No transactions")}
          description={t("Record a banking transaction.")}
          action={
            <Link href="/dashboard/agency-banking/create">
              <Button>{t("New Transaction")}</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLS} rows={rows} />
      )}

      <DetailDialog
        open={!!viewItem}
        kind="agency-banking"
        data={viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}
