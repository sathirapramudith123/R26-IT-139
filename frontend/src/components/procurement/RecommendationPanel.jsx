"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function RecommendationPanel({
  recommendations = [],
  loading = false,
  onRefresh,
  onSaveDecision,
}) {
  return (
    <Card className="mb-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-outfit text-lg font-bold text-slate-900">
            Smart Procurement Recommendations
          </h2>
          <p className="text-sm text-slate-500">
            Generated using stock levels and supplier scoring.
          </p>
        </div>

        <Button onClick={onRefresh} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-slate-500">
          No recommendations available.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.item_id}
              className="rounded-xl border p-4"
            >
              <h3 className="font-semibold">{rec.item_name}</h3>

              <p className="text-sm">
                Stock: {rec.current_quantity} | Reorder: {rec.reorder_level}
              </p>

              <p className="text-sm">
                Recommended Qty: {rec.recommended_quantity}
              </p>

              <p className="text-sm">
                Supplier: {rec.recommended_supplier_name}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                {rec.decision_reason}
              </p>

              <Button
                className="mt-3"
                onClick={() =>
                  onSaveDecision?.({
                    item_id: rec.item_id,
                    item_name: rec.item_name,
                    current_quantity: rec.current_quantity,
                    reorder_level: rec.reorder_level,
                    recommended_quantity: rec.recommended_quantity,
                    recommended_supplier_id: rec.recommended_supplier_id,
                    recommended_supplier_name: rec.recommended_supplier_name,
                    supplier_score: rec.supplier_score,
                    decision_reason: rec.decision_reason,
                    decision_type: "auto",
                    status: "pending",
                  })
                }
              >
                Save Decision
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}