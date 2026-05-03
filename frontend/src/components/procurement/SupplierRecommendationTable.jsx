import Card from "@/components/ui/Card";

export default function SupplierRecommendationTable({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <Card key={s.supplier_id}>
          <div className="flex justify-between">
            <div>
              <h3 className="font-bold">{s.supplier_name}</h3>
              <p className="text-sm text-slate-500">
                Rank: #{s.rank}
              </p>

              <p className="text-sm">
                Unit Price: LKR {s.unit_price}
              </p>

              <p className="text-sm">
                Delivery Cost: LKR {s.delivery_cost}
              </p>

              <p className="text-sm">
                Profit: LKR {s.estimated_profit}
              </p>
            </div>

            <div className="text-right">
              <p className="font-bold text-green-600">
                Score: {s.final_score}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {s.reason}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}