"use client";

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { formatCurrency, formatDate, scoreColor } from "@/lib/formatters/index";

import { t } from "@/lib/i18n";
const COLS = [
  {
    key: "item_name",
    get label() {
      return t("Item");
    },
  },
  {
    key: "selected_supplier_name",
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
    key: "total_cost",
    get label() {
      return t("Total Cost");
    },
  },
  {
    key: "estimated_profit",
    get label() {
      return t("Est. Profit");
    },
  },
  {
    key: "final_score",
    get label() {
      return t("Score");
    },
  },
  {
    key: "status",
    get label() {
      return t("Status");
    },
  },
  {
    key: "created_at",
    get label() {
      return t("Date");
    },
  },
  { key: "actions", label: "" },
];

export default function ProcurementTable({ items = [], onDelete, deleting }) {
  const rows = items.map((item) => ({
    ...item,
    selected_supplier_name: item.selected_supplier_name ?? "—",
    total_cost: formatCurrency(item.total_cost),
    estimated_profit: (
      <span
        className={
          Number(item.estimated_profit) >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"
        }
      >
        {formatCurrency(item.estimated_profit)}
      </span>
    ),
    final_score: (
      <span className={`font-semibold ${scoreColor(item.final_score)}`}>
        {Number(item.final_score ?? 0).toFixed(1)}
        <span className="text-xs font-normal text-slate-400">/100</span>
      </span>
    ),
    status: <StatusBadge status={item.status} />,
    created_at: formatDate(item.created_at),
    actions: (
      <div className="flex gap-2">
        <Link href={`/dashboard/procurement/${item.id}`}>
          <Button variant="ghost" size="sm">
            {t("View")}
          </Button>
        </Link>
        <Link href={`/dashboard/procurement/${item.id}/edit`}>
          <Button variant="primary" size="sm">
            {t("Edit")}
          </Button>
        </Link>
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(item.id)}
            disabled={deleting === item.id}
          >
            {deleting === item.id ? "..." : t("Delete")}
          </Button>
        )}
      </div>
    ),
  }));

  return <Table columns={COLS} rows={rows} />;
}
