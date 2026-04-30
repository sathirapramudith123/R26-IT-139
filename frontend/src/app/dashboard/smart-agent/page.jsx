"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { smartAgentApi } from "@/services/api/smartAgent.api";

const SAMPLE_INSIGHTS = [
  { id: "agi-001", title: "Demand Forecast", insight: "Rice and dhal demand likely to rise before the weekend based on purchase patterns.", recommendation: "Restock rice packets within the next 2 days to avoid stockouts.", status: "active", icon: "📈" },
  { id: "agi-002", title: "Supplier Tip", insight: "Colombo Wholesale offers bulk discounts on orders above LKR 20,000.", recommendation: "Consolidate next procurement order to exceed threshold and save 8%.", status: "active", icon: "💡" },
  { id: "agi-003", title: "Savings Opportunity", insight: "Weekend sales revenue is consistently 40% higher than weekdays.", recommendation: "Increase automated savings transfer on Sundays to build your festival fund.", status: "pending", icon: "🏦" }
];

export default function SmartAgentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smartAgentApi.list()
      .then((d) => setItems(Array.isArray(d) && d.length > 0 ? d : SAMPLE_INSIGHTS))
      .catch(() => setItems(SAMPLE_INSIGHTS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Agent"
        description="AI-assisted insights for inventory, savings, and supplier decisions."
      />

      {/* Banner */}
      <div className="rounded-2xl gradient-teal p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <p className="font-outfit font-semibold">Lanka-Link AI is active</p>
            <p className="text-sm text-white/80">Analysing your sales patterns, stock levels, and supplier data in real-time.</p>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner label="Generating insights…" /> : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          {items.map((item) => (
            <div key={item.id} className="card group hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    {item.icon ?? "💡"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-outfit font-semibold text-slate-900">{item.title}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.insight}</p>
                  </div>
                </div>
              </div>
              {item.recommendation && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Recommendation</p>
                  <p className="text-sm text-slate-700">{item.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
