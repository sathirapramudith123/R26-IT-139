import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";

export default function LedgerCard({ item }) {
  if (!item) return null;

  const fields = [
    { label: "Amount", value: `LKR ${Number(item.amount || 0).toLocaleString()}` },
    { label: "Entry Type", value: item.entry_type || "—" },
    { label: "Category", value: item.category || "—" },
    { label: "Payment Method", value: item.payment_method || "—" },
    { label: "Source Transaction", value: item.source_transaction_id || "Manual Entry" },
    {
      label: "Created",
      value: item.created_at
        ? new Date(item.created_at).toLocaleDateString("en-LK")
        : "—",
    },
    {
      label: "Updated",
      value: item.updated_at
        ? new Date(item.updated_at).toLocaleDateString("en-LK")
        : "—",
    },
  ];

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-outfit text-lg font-semibold text-slate-900">
            {item.title || "Untitled Ledger Entry"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>
        </div>

        {item.status && <StatusBadge status={item.status} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">{field.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {String(field.value).replaceAll("_", " ")}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}