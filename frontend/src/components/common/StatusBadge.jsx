const tones = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  low_stock: "bg-amber-50 text-amber-700 border-amber-200",
  inactive:  "bg-slate-100 text-slate-600 border-slate-200",
};
const dots = {
  pending: "bg-amber-500", active: "bg-emerald-500", available: "bg-emerald-500",
  completed: "bg-blue-500", failed: "bg-red-500", low_stock: "bg-amber-500", inactive: "bg-slate-400",
};
export default function StatusBadge({ status = "pending" }) {
  const key = status?.toLowerCase();
  return (
    <span className={`badge border ${tones[key]??"bg-slate-100 text-slate-600 border-slate-200"}`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dots[key]??"bg-slate-400"}`} />
      {status}
    </span>
  );
}
