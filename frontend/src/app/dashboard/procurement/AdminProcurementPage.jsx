"use client";
import PageHeader from "@/components/common/PageHeader";
import AdminPriceUploadWidget from "@/components/dashboard/AdminPriceUploadWidget";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MLAnalyticsWidget from "@/components/dashboard/MLAnalyticsWidget";

export default function AdminProcurementPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement"
        description="Upload the HKARTI daily wholesale price PDF. Merchants will use this data for supplier recommendations."
      />

      <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-700 leading-relaxed">
        <strong className="text-teal-800">How it works:</strong> Upload the daily price bulletin from the
        Hector Kobbekaduwa Agrarian Research and Training Institute. Once uploaded, merchants can open
        Procurement from their sidebar and run supplier recommendations — their prices will be
        benchmarked against the government wholesale average you uploaded here.
      </div>

      {/* ML analytics shown to admin too */}
      <MLAnalyticsWidget />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPriceUploadWidget />
        <MarketPriceWidget />
      </div>
    </div>
  );
}