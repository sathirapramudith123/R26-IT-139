"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supplierApi } from "@/services/api/supplier.api";
import { formatCurrency } from "@/lib/formatters/index";

function ScoreRing({ score, label, color = "#1D9E75" }) {
  const pct  = Math.min(100, Math.max(0, Number(score || 50)));
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x="36" y="38" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 14, fontWeight: 700, fill: "#1e293b" }}>
          {pct.toFixed(0)}
        </text>
      </svg>
      <p className="text-[10px] text-slate-500 text-center leading-tight">{label}</p>
    </div>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0">
      <p className="text-xs text-slate-400 shrink-0 w-36">{label}</p>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending:  "bg-amber-50   text-amber-700   border-amber-200",
    inactive: "bg-slate-100  text-slate-500   border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${map[status] || map.inactive}`}>
      {status}
    </span>
  );
}

export default function SupplierDetailPage() {
  useAuthGuard();
  const { supplierId } = useParams();
  const router         = useRouter();

  const [item,     setItem]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    supplierApi.getById(supplierId)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [supplierId]);

  async function handleDelete() {
    if (!confirm("Delete this supplier? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await supplierApi.remove(supplierId);
      router.push("/dashboard/suppliers");
    } catch (e) {
      alert(e.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="page-container">
      <PageHeader title="Supplier Details" />
      <LoadingSpinner />
    </div>
  );

  if (!item) return (
    <div className="page-container">
      <PageHeader title="Supplier Details" />
      <Card><p className="text-slate-500 text-sm">Supplier not found.</p></Card>
    </div>
  );

  // Use 50 as neutral default for new suppliers with no history
  const reliabilityScore = Number(item.reliability_score ?? 50);
  const deliveryScore    = Number(item.delivery_score    ?? 50);
  const priceScore       = Number(item.price_score       ?? 50);
  const profitScore      = Number(item.profit_score      ?? 50);
  const totalOrders      = Number(item.total_orders      ?? 0);
  const completedOrders  = Number(item.completed_orders  ?? 0);

  // Overall score — weighted average of the 4 components
  const totalScore = Number(item.total_score)
    || parseFloat(
        (priceScore * 0.40 + profitScore * 0.30
         + reliabilityScore * 0.20 + deliveryScore * 0.10).toFixed(1)
      );

  const overallColor =
    totalScore >= 75 ? "#1D9E75" :
    totalScore >= 50 ? "#BA7517" : "#E24B4A";

  const isNewSupplier = totalOrders === 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Supplier Details"
        description="Supplier profile and automatically computed performance scores."
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {/* Header card */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-outfit text-2xl font-bold text-slate-900">{item.name}</h2>
              <StatusPill status={item.status} />
            </div>
            <p className="text-sm text-slate-500">{item.company_name}</p>
            {item.item_name && (
              <p className="text-xs text-teal-600 font-medium mt-1">
                🥦 Supplies: {item.item_name}
              </p>
            )}
            {item.address && (
              <p className="text-xs text-slate-400 mt-1">📍 {item.address}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/dashboard/suppliers/${item.id}/edit`}>
              <Button variant="primary" size="sm">Edit</Button>
            </Link>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Contact details */}
        <Card>
          <h3 className="font-outfit font-semibold text-slate-900 mb-3">
            Contact details
          </h3>
          <div>
            <InfoRow label="Supplier name" value={item.name} />
            <InfoRow label="Company"       value={item.company_name} />
            <InfoRow label="Phone"         value={item.contact_number} />
            <InfoRow label="Email"         value={item.email} />
            <InfoRow label="Address"       value={item.address || "—"} />
            <InfoRow label="Status"        value={item.status} />
          </div>
        </Card>

        {/* Procurement details — only what merchant provided */}
        <Card>
          <h3 className="font-outfit font-semibold text-slate-900 mb-3">
            Procurement details
          </h3>
          <div>
            <InfoRow
              label="Item supplied"
              value={item.item_name || "—"}
              sub="Commodity this supplier provides"
            />
            <InfoRow
              label="Unit price"
              value={formatCurrency(item.unit_price)}
              sub="Price per unit charged by this supplier"
            />
            <InfoRow
              label="Delivery cost"
              value={formatCurrency(item.delivery_cost)}
              sub={Number(item.delivery_cost) === 0
                ? "Free delivery"
                : "Total cost to deliver one order"}
            />
          </div>
        </Card>
      </div>

      {/* Performance scores */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-outfit font-semibold text-slate-900">
              Performance scores
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculated automatically — never entered manually.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-outfit" style={{ color: overallColor }}>
              {totalScore.toFixed(1)}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <p className="text-[10px] text-slate-400">Overall score</p>
          </div>
        </div>

        {/* Score rings */}
        <div className="flex justify-around py-4 border border-slate-100 rounded-xl mb-4">
          <ScoreRing score={priceScore}       label="Cost (40%)"        color="#1D9E75" />
          <ScoreRing score={profitScore}      label="Profit (30%)"      color="#7F77DD" />
          <ScoreRing score={reliabilityScore} label="Reliability (20%)" color="#BA7517" />
          <ScoreRing score={deliveryScore}    label="Delivery (10%)"    color="#378ADD" />
        </div>

        {/* Order history summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-xl font-bold text-slate-800">{totalOrders}</p>
            <p className="text-xs text-slate-400">Total orders</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{completedOrders}</p>
            <p className="text-xs text-emerald-600">Completed orders</p>
          </div>
        </div>

        {/* New supplier notice */}
        {isNewSupplier && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">
              ℹ New supplier — scores start at 50 (neutral)
            </p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Reliability and delivery scores are 50 because there is no order history yet.
              They update automatically each time you complete a procurement decision
              with this supplier.
            </p>
          </div>
        )}

        {/* Score explanations */}
        <div className="space-y-2">
          {[
            {
              label: "Cost score (40%)",
              score: priceScore,
              color: "bg-emerald-50 border-emerald-200 text-emerald-800",
              dot:   "bg-emerald-500",
              text:  "Compared against HARTI government wholesale price average. " +
                     "Lower supplier price than market average = higher score. Most important factor.",
            },
            {
              label: "Profit score (30%)",
              score: profitScore,
              color: "bg-purple-50 border-purple-200 text-purple-800",
              dot:   "bg-purple-400",
              text:  "Your selling price minus (unit price × quantity + delivery cost). " +
                     "Calculated automatically each time you request a recommendation.",
            },
            {
              label: "Reliability score (20%)",
              score: reliabilityScore,
              color: "bg-amber-50 border-amber-200 text-amber-800",
              dot:   "bg-amber-400",
              text:  isNewSupplier
                ? `No order history yet — score is 50 (neutral). Will improve automatically as you complete orders with ${item.name}.`
                : `${completedOrders} of ${totalOrders} orders completed = ${reliabilityScore.toFixed(0)}% reliability. Updates automatically with every new order.`,
            },
            {
              label: "Delivery score (10%)",
              score: deliveryScore,
              color: "bg-blue-50 border-blue-200 text-blue-800",
              dot:   "bg-blue-400",
              text:  isNewSupplier
                ? "No delivery history yet — score is 50 (neutral). Will update once orders are completed and delivery dates are recorded."
                : `On-time delivery rate from past orders. Score is ${deliveryScore.toFixed(0)}/100.`,
            },
          ].map(s => (
            <div key={s.label}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${s.color}`}>
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.dot}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold">{s.label}</p>
                  <span className="text-xs font-bold">
                    {Number(s.score).toFixed(0)}/100
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-80">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendation status */}
      {isNewSupplier ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-800 mb-0.5">
            ℹ New supplier — will appear in recommendations
          </p>
          <p className="text-xs text-blue-700">
            Since there is no order history, reliability and delivery scores are neutral (50).
            This supplier will appear in procurement recommendations based on their price
            and your expected profit. Scores will improve as you build order history.
          </p>
        </div>
      ) : totalScore >= 75 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800 mb-0.5">
            ✓ Recommended supplier
          </p>
          <p className="text-xs text-emerald-700">
            Score {totalScore.toFixed(1)}/100 — this supplier will appear as a top
            recommendation in procurement decisions.
          </p>
        </div>
      ) : totalScore >= 50 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 mb-0.5">
            ⚠ Average supplier
          </p>
          <p className="text-xs text-amber-700">
            Score {totalScore.toFixed(1)}/100 — will appear in recommendations but likely
            not as the top choice. Consider negotiating a better price or delivery cost.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 mb-0.5">
            ✗ Low score — review before selecting
          </p>
          <p className="text-xs text-red-700">
            Score {totalScore.toFixed(1)}/100 — this supplier has a poor track record
            or high prices. Check order history and consider updating their unit price.
          </p>
        </div>
      )}
    </div>
  );
}