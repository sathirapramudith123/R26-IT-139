import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, formatDate, titleCase } from "@/lib/formatters";

const COLS = ["Type", "Description", "Amount", "Payment", "Category", "Status", "Date", ""];

export default function TransactionTable({ items = [], onDelete, deleting }) {
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
            <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">No transactions found</td></tr>
          ) : items.map(item => {
            const isIncome = ["sale","deposit"].includes(item.transaction_type);
            return (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-medium capitalize text-slate-800">{titleCase(item.transaction_type ?? "")}</td>
                <td className="px-5 py-3.5 text-slate-500 max-w-[180px] truncate">{item.description ?? "—"}</td>
                <td className={`px-5 py-3.5 font-semibold ${isIncome ? "text-green-600" : "text-red-500"}`}>
                  {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
                </td>
                <td className="px-5 py-3.5 capitalize text-slate-600">{titleCase(item.payment_method ?? "")}</td>
                <td className="px-5 py-3.5 capitalize text-slate-600">{titleCase(item.category ?? "")}</td>
                <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(item.date ?? item.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <Link href={`/dashboard/transactions/${item.id}`} className="btn-ghost text-xs px-3 py-1.5">View</Link>
                    <Link href={`/dashboard/transactions/${item.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">Edit</Link>
                    <button onClick={() => onDelete?.(item.id)} disabled={deleting === item.id}
                      className="btn-danger text-xs px-3 py-1.5">
                      {deleting === item.id ? "..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
