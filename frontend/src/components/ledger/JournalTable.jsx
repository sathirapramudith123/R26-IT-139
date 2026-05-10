import { formatCurrency, formatDate } from "@/lib/formatters";

const COLS = ["Date", "Description", "Account", "Debit (LKR)", "Credit (LKR)"];

export default function JournalTable({ entries = [] }) {
  const rows = [];
  entries.forEach(entry => {
    (entry.lines ?? []).forEach((line, idx) => {
      rows.push({
        key:         `${entry.id}-${idx}`,
        date:        idx === 0 ? formatDate(entry.created_at) : "",
        description: idx === 0 ? entry.description : "",
        account:     `${line.account_code ?? ""} ${line.account_name ?? ""}`.trim(),
        debit:       line.entry_type === "debit"  ? formatCurrency(line.amount) : "",
        credit:      line.entry_type === "credit" ? formatCurrency(line.amount) : "",
        isDebit:     line.entry_type === "debit",
      });
    });
  });

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
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No journal entries yet</td></tr>
          ) : rows.map(row => (
            <tr key={row.key} className="hover:bg-slate-50/40 transition-colors">
              <td className="px-5 py-3 text-slate-500 text-xs">{row.date}</td>
              <td className="px-5 py-3 text-slate-600 max-w-[200px] truncate">{row.description}</td>
              <td className="px-5 py-3 text-slate-700">{row.account}</td>
              <td className="px-5 py-3 font-semibold text-blue-600">{row.debit}</td>
              <td className="px-5 py-3 font-semibold text-emerald-600">{row.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
