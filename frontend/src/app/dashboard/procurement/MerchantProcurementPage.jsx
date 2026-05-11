"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MLAnalyticsWidget from "@/components/dashboard/MLAnalyticsWidget";
import useProcurement from "@/hooks/useProcurement";
import { formatCurrency } from "@/lib/formatters/index";

export default function MerchantProcurementPage() {
  const { items, fetchAll } = useProcurement();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const recentDecisions = [...items]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement"
        description="Market analytics and supplier recommendations."
      />

      <MarketPriceWidget />

      <MLAnalyticsWidget />

      {recentDecisions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-outfit font-semibold text-slate-900">
              Recent Decisions
            </h3>
          </div>
          <div className="space-y-2">
            {recentDecisions.map(d => (
              <div key={d.id}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.item_name}</p>
                  <p className="text-xs text-slate-400">
                    {d.selected_supplier_name || "—"} · Qty {d.quantity}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">{formatCurrency(d.total_cost)}</p>
                  <p className={`text-xs font-semibold ${Number(d.estimated_profit) >= 0
                    ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(d.estimated_profit)}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium
                  ${d.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    d.status === "pending"   ? "bg-amber-50  text-amber-700"   :
                                               "bg-slate-100 text-slate-500"}`}>
                  {d.status}
                </span>
                <Link href={`/dashboard/procurement/${d.id}`} className="shrink-0">
                  <span className="text-xs text-teal-600 hover:underline">View →</span>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}