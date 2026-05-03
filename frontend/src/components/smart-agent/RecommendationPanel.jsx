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
            Generated using stock levels, reorder rules, and supplier scores.
          </p>
        </div>

        <Button variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Generating..." : "Generate Recommendations"}
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          No recommendations available. Low-stock items will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.item_id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {rec.item_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Current stock:{" "}
                    <span className="font-semibold">
                      {rec.current_quantity} {rec.unit}
                    </span>{" "}
                    | Reorder level:{" "}
                    <span className="font-semibold">
                      {rec.reorder_level} {rec.unit}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Recommended quantity:{" "}
                    <span className="font-semibold">
                      {rec.recommended_quantity} {rec.unit}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Supplier:{" "}
                    <span className="font-semibold">
                      {rec.recommended_supplier_name || "No supplier found"}
                    </span>{" "}
                    | Score:{" "}
                    <span className="font-semibold">
                      {rec.supplier_score}
                    </span>
                  </p>

                  <div className="mt-3 rounded-xl bg-primary/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Decision Reason
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {rec.decision_reason}
                    </p>
                  </div>
                </div>

                <Button
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
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}