import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, scoreColor } from "@/lib/utils";

export default function SupplierCard({ item, onDelete, deleting }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-outfit text-base font-semibold text-slate-900">{item.name}</h3>
          <p className="text-xs text-slate-400">{item.company_name ?? "N/A"}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Contact",    item.contact_number ?? "—"],
          ["Unit Price", formatCurrency(item.unit_price)],
          ["Delivery",   formatCurrency(item.delivery_cost)],
          ["Stock Qty",  item.available_quantity ?? 0],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-400">{l}</p>
            <p className="text-sm font-semibold text-slate-800">{v}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[["Price", item.price_score], ["Reliability", item.reliability_score], ["Delivery", item.delivery_score]].map(([l, v]) => (
          <div key={l} className="flex items-center gap-2">
            <span className="w-20 text-xs text-slate-400">{l}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, Number(v ?? 0))}%` }} />
            </div>
            <span className={`w-8 text-right text-xs font-semibold ${scoreColor(v)}`}>{Number(v ?? 0).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
          <span className="text-xs font-semibold text-slate-500">Total score</span>
          <span className={`text-sm font-bold ${scoreColor(item.total_score)}`}>{Number(item.total_score ?? 0).toFixed(1)}</span>
        </div>
      </div>
      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <Link href={`/dashboard/suppliers/${item.id}`} className="btn-ghost flex-1 text-center text-xs py-2">View</Link>
        <Link href={`/dashboard/suppliers/${item.id}/edit`} className="btn-secondary flex-1 text-center text-xs py-2">Edit</Link>
        <button onClick={() => onDelete?.(item.id)} disabled={deleting === item.id}
          className="btn-danger flex-1 text-xs py-2">
          {deleting === item.id ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
