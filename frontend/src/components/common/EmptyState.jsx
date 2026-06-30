export default function EmptyState({ title = "No data yet", description = "Get started by creating your first record.", icon = "📭", action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
      <div className="mb-4 text-5xl opacity-60">{icon}</div>
      <h3 className="font-outfit text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}