import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";

export default function ProcurementCard({ item }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {item?.item_name || "Procurement Decision"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Recommended Supplier:{" "}
            {item?.recommended_supplier_name || "No supplier"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Recommended Quantity: {item?.recommended_quantity ?? "-"}
          </p>
        </div>

        {item?.status && <StatusBadge status={item.status} />}
      </div>

      {item?.decision_reason && (
        <div className="mt-4 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Decision Reason
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {item.decision_reason}
          </p>
        </div>
      )}
    </Card>
  );
}