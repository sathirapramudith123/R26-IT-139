import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";

export default function SavingsCard({ item }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{item?.target || item?.title || "Untitled"}</h3>
          <p className="mt-1 text-sm text-slate-500">ID: {item?.id || "-"}</p>
        </div>
        {item?.status ? <StatusBadge status={item.status} /> : null}
      </div>
      <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {JSON.stringify(item, null, 2)}
      </pre>
    </Card>
  );
}
