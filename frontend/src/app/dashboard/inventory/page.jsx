"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useInventory from "@/hooks/useInventory";
import { inventoryApi } from "@/services/api/inventory";
import { formatCurrency } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

import { t } from "@/lib/i18n";
const COLS = [
  {
    key: "name",
    get label() {
      return t("Item");
    },
  },
  {
    key: "supplier_name",
    get label() {
      return t("Supplier");
    },
  },
  {
    key: "quantity",
    get label() {
      return t("Qty");
    },
  },
  {
    key: "reorder_level",
    get label() {
      return t("Reorder");
    },
  },
  {
    key: "cost_price",
    get label() {
      return t("Unit Cost");
    },
  }, // cost only (no separate selling price)
  { key: "actions", label: "" },
];

export default function InventoryPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useInventory();
  const [viewItem, setViewItem] = useState(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    try {
      await inventoryApi.remove(id);
      await fetchAll();
    } catch (e) {
      alert(e.message || t("Failed"));
    }
  }

  const lowCount = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level)).length;
  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter((i) => [i.name, i.supplier_name].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  // Cost cell: weighted average, plus the range when there are several batches
  const costCell = (item) => {
    const avg = formatCurrency(item.cost_price);
    const multi = Number(item.batch_count) > 1 && Number(item.cost_min) !== Number(item.cost_max);
    if (!multi) return avg;
    return (
      <div className="leading-tight">
        <div>{avg}</div>
        <div className="text-xs text-slate-400">
          {formatCurrency(item.cost_min)}–{formatCurrency(item.cost_max)} · {item.batch_count} batches
        </div>
      </div>
    );
  };

  const rows = filtered.map((item) => ({
    ...item,
    supplier_name: item.supplier_name ?? "—",
    cost_price: costCell(item),
    quantity:
      Number(item.quantity) <= Number(item.reorder_level) ? (
        <span className="font-semibold text-red-600">{item.quantity}</span>
      ) : (
        item.quantity
      ),
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>
          {t("View")}
        </Button>
        <Link href={`/dashboard/inventory/${item.id}/edit`}>
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
        title={t("Inventory")}
        description={t("Track stock levels and items.")}
        action={
          <Link href="/dashboard/inventory/create">
            <Button>{t("+ Add Item")}</Button>
          </Link>
        }
      />
      {lowCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            ⚠ {lowCount} item{lowCount > 1 ? "s" : ""} {t("running low.")}
          </span>
          <Link href="/dashboard/inventory/alerts">
            <Button variant="secondary" size="sm">
              {t("View Alerts")}
            </Button>
          </Link>
        </div>
      )}
      <Card className="mb-4">
        <input
          type="text"
          placeholder={t("Search by name or supplier...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </Card>
      {loading ? (
        <LoadingSpinner label={t("Loading inventory...")} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📦"
          title={t("No inventory items")}
          description={t("Add your first stock item.")}
          action={
            <Link href="/dashboard/inventory/create">
              <Button>{t("Add Item")}</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLS} rows={rows} />
      )}

      <DetailDialog open={!!viewItem} kind="inventory" data={viewItem} onClose={() => setViewItem(null)} />
    </div>
  );
}
