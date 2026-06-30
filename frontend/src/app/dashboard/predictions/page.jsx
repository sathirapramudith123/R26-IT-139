"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";

const MODELS = [
  { href: "/dashboard/predictions/credit",      icon: "💳", title: "Credit Readiness", desc: "Score loan readiness (Component 1)." },
  { href: "/dashboard/predictions/demand",      icon: "📈", title: "Demand Forecast",  desc: "Predict item demand (Component 2)." },
  { href: "/dashboard/predictions/procurement", icon: "🛒", title: "Buy Now or Wait",  desc: "Procurement timing (Component 3)." },
  { href: "/dashboard/predictions/anomaly",     icon: "🛡", title: "Banking Anomaly",  desc: "Flag suspicious transactions (Component 4)." },
];

export default function PredictionsHub() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="Smart Predictions" description="Four explainable ML models powering the platform." />
      <div className="grid gap-5 sm:grid-cols-2">
        {MODELS.map(m => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full hover:-translate-y-0.5 transition-all">
              <div className="text-3xl mb-2">{m.icon}</div>
              <h3 className="font-outfit font-semibold text-slate-900">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}