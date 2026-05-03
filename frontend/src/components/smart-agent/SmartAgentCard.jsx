import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";

export default function SmartAgentCard({ item }) {
  return (
    <Card className="hover:shadow-card-hover transition-all">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-outfit font-semibold text-slate-900">{item?.title ?? "Insight"}</h3>
            {item?.status && <StatusBadge status={item.status} />}
          </div>
          {item?.insight && <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.insight}</p>}
          {item?.recommendation && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Recommendation</p>
              <p className="text-sm text-slate-700">{item.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
