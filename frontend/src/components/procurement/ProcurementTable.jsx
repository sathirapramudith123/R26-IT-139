import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { formatCurrency, formatDate, scoreColor } from "@/lib/formatters/index";

const COLS = [
  { key: "item_name",             label: "Item"         },
  { key: "selected_supplier_name",label: "Supplier"     },
  { key: "quantity",              label: "Qty"          },
  { key: "total_cost",            label: "Total Cost"   },
  { key: "estimated_profit",      label: "Est. Profit"  },
  { key: "final_score",           label: "Score"        },
  { key: "status",                label: "Status"       },
  { key: "created_at",            label: "Date"         },
  { key: "actions",               label: ""             },
];

export default function ProcurementTable({ items = [], onDelete, deleting }) {
  const rows = items.map(item => ({
    ...item,
    selected_supplier_name: item.selected_supplier_name ?? "—",
    total_cost:     formatCurrency(item.total_cost),
    estimated_profit: (
      <span className={Number(item.estimated_profit) >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
        {formatCurrency(item.estimated_profit)}
      </span>
    ),
    final_score: (
      <span className={`font-semibold ${scoreColor(item.final_score)}`}>
        {Number(item.final_score ?? 0).toFixed(1)}
        <span className="text-xs font-normal text-slate-400">/100</span>
      </span>
    ),
    status:     <StatusBadge status={item.status} />,
    created_at: formatDate(item.created_at),
    actions: (
      <div className="flex gap-2">
        <Link href={`/dashboard/procurement/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
        <Link href={`/dashboard/procurement/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={() => onDelete(item.id)} disabled={deleting === item.id}>
            {deleting === item.id ? "..." : "Delete"}
          </Button>
        )}
      </div>
    ),
  }));

  return <Table columns={COLS} rows={rows} />;
}
