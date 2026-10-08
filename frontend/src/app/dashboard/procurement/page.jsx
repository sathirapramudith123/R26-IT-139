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
import useProcurement from "@/hooks/useProcurement";
import { procurementApi } from "@/services/api/procurement";
import { formatCurrency } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

import { t } from "@/lib/i18n";
const COLS = [
  {
    key: "item_name",
    get label() {
      return t("Item");
    },
  },
  {
    key: "quantity",
    get label() {
      return t("Qty");
    },
  },
  {
    key: "total_cost",
    get label() {
      return t("Total Cost");
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

export default function ProcurementPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useProcurement();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this record?")) return;
    try {
      await procurementApi.remove(id);
      await fetchAll();
    } catch (e) {
      alert(e.message || t("Failed"));
    }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw
      ? items
      : items.filter((i) => [i.item_name, i.selected_supplier_name].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map((item) => {
    // an order can hold several items — show "Rice +2" and "3 items" (adding kg and pcs meant nothing)
    const lines = Array.isArray(item.items) && item.items.length ? item.items : null;
    const first = lines ? lines[0] : item;
    return {
      ...item,
      item_name:
        lines && lines.length > 1
          ? `${first.item_name} +${lines.length - 1}`
          : first.item_name || item.item_name,
      quantity:
        lines && lines.length > 1
          ? `${lines.length} ${t("items")}`
          : `${Number(first.quantity ?? item.quantity) || 0}${first.unit ? ` ${t(first.unit)}` : ""}`,
      total_cost: (
        <span className="whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
          {formatCurrency(item.total_cost)}
        </span>
      ),
      status: <StatusBadge status={item.status} />,
      actions: (
        <div className="flex gap-2">
          <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>
            {t("View")}
          </Button>
          <Link href={`/dashboard/procurement/${item.id}/edit`}>
            <Button variant="secondary" size="sm">
              {t("Edit")}
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
            {t("Delete")}
          </Button>
        </div>
      ),
    };
  });

  return (
    <div className="page-container">
      <PageHeader
        title={t("Procurement")}
        description={t("Manage procurement decisions.")}
        action={
          <Link href="/dashboard/procurement/create">
            <Button>{t("+ New Decision")}</Button>
          </Link>
        }
      />
      <Card className="mb-4">
        <input
          type="text"
          placeholder={t("Search by item or supplier...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </Card>
      {loading ? (
        <LoadingSpinner label={t("Loading procurement...")} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title={t("No procurement records")}
          description={t("Create your first decision.")}
          action={
            <Link href="/dashboard/procurement/create">
              <Button>{t("New Decision")}</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLS} rows={rows} />
      )}

      <DetailDialog open={!!viewItem} kind="procurement" data={viewItem} onClose={() => setViewItem(null)} />
    </div>
  );
}
