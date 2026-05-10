import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate, scoreColor } from "@/lib/formatters/index";

export default function ProcurementCard({ item, onDelete, deleting }) {
  if (!item) return null;
  return (
    <div className="card hover:-translate-y-0.5 transition-all duration-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-outfit text-base font-semibold text-slate-900 truncate">{item.item_name ?? "Procurement Decision"}</h3>
          <p className="mt-0.5 text-xs text-slate-400">Supplier: {item.selected_supplier_name ?? "—"}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          ["Quantity",    item.quantity],
          ["Total Cost",  formatCurrency(item.total_cost)],
          ["Est. Profit", formatCurrency(item.estimated_profit)],
          ["Location",    item.delivery_location ?? "—"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-400">{l}</p>
            <p className="text-xs font-semibold text-slate-700 truncate">{v}</p>
          </div>
        ))}
      </div>

      {item.final_score != null && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs text-slate-500">Score</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${Math.min(100, Number(item.final_score) || 0)}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${scoreColor(item.final_score)}`}>
            {Number(item.final_score ?? 0).toFixed(1)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
        <div className="flex gap-2">
          <Link href={`/dashboard/procurement/${item.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          <Link href={`/dashboard/procurement/${item.id}/edit`}>
            <Button variant="primary" size="sm">Edit</Button>
          </Link>
          {onDelete && (
            <Button variant="danger" size="sm" onClick={() => onDelete(item.id)} disabled={deleting === item.id}>
              {deleting === item.id ? "..." : "Delete"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
