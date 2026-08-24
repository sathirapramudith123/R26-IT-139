export default function Table({ columns = [], rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800">
            {columns.map(col => (
              <th
                key={col.key}
                className="px-5 py-3.5 font-outfit text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500"
              >
                No records found
              </td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
            >
              {columns.map(col => (
                <td key={col.key} className="px-5 py-3.5 text-slate-700 dark:text-slate-200">
                  {row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}