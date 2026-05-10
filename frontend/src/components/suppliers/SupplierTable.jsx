import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, scoreColor } from "@/lib/utils";

const COLS = ["Supplier", "Company", "Contact", "Unit Price", "Score", "Status", ""];

export default function SupplierTable({ items = [], onDelete, deleting }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {COLS.map(c => (
              <th key={c} className="px-5 py-3.5 font-outfit text-xs font-semibold uppercase tracking-wider text-slate-500">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.length === 0 ? (
            <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No suppliers found</td></tr>
          ) : items.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-medium text-slate-800">{item.name}</td>
              <td className="px-5 py-3.5 text-slate-600">{item.company_name ?? "—"}</td>
              <td className="px-5 py-3.5 text-slate-600">{item.contact_number ?? "—"}</td>
              <td className="px-5 py-3.5 text-slate-700">{formatCurrency(item.unit_price)}</td>
              <td className="px-5 py-3.5">
                <span className={`font-semibold ${scoreColor(item.total_score)}`}>{Number(item.total_score ?? 0).toFixed(1)}</span>
              </td>
              <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
              <td className="px-5 py-3.5">
                <div className="flex gap-2">
                  <Link href={`/dashboard/suppliers/${item.id}`} className="btn-ghost text-xs px-3 py-1.5">View</Link>
                  <Link href={`/dashboard/suppliers/${item.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">Edit</Link>
                  <button onClick={() => onDelete?.(item.id)} disabled={deleting === item.id}
                    className="btn-danger text-xs px-3 py-1.5">
                    {deleting === item.id ? "..." : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
