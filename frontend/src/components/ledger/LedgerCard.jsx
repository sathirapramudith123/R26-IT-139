import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";

export default function LedgerCard({ item }) {
  if (!item) return null;
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-outfit text-lg font-semibold text-slate-900">{item.title ?? "Untitled"}</h3>
          <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>
        </div>
        {item.status && <StatusBadge status={item.status} />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Amount", value: item.amount ? `LKR ${Number(item.amount).toLocaleString()}` : "—" },
          { label: "Type", value: item.entry_type ?? "—" },
          { label: "Created", value: item.created_at ? new Date(item.created_at).toLocaleDateString("en-LK") : "—" },
          { label: "Updated", value: item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-LK") : "—" }
        ].map((d) => (
          <div key={d.label} className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">{d.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{d.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
