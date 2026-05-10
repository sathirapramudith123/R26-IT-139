import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, formatDate, titleCase } from "@/lib/formatters";

export default function TransactionCard({ item, onDelete, deleting }) {
  const isIncome = ["sale","deposit"].includes(item.transaction_type);
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-outfit text-base font-semibold capitalize text-slate-900">
            {titleCase(item.transaction_type ?? "Transaction")}
          </h3>
          <p className="text-xs text-slate-400">{item.description ?? "—"}</p>
        </div>
        <span className={`text-lg font-bold ${isIncome ? "text-green-600" : "text-red-500"}`}>
          {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Payment", titleCase(item.payment_method ?? "")],
          ["Category", titleCase(item.category ?? "")],
          ["Date", formatDate(item.date ?? item.created_at)],
          ["Status", <StatusBadge key="s" status={item.status} />],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-400">{l}</p>
            <div className="text-sm font-semibold text-slate-800">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <Link href={`/dashboard/transactions/${item.id}`} className="btn-ghost flex-1 text-center text-xs py-2">View</Link>
        <Link href={`/dashboard/transactions/${item.id}/edit`} className="btn-secondary flex-1 text-center text-xs py-2">Edit</Link>
        <button onClick={() => onDelete?.(item.id)} disabled={deleting === item.id}
          className="btn-danger flex-1 text-xs py-2">
          {deleting === item.id ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
