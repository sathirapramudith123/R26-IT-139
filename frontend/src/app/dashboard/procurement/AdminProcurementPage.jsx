"use client";
import PageHeader from "@/components/common/PageHeader";
import AdminPriceUploadWidget from "@/components/dashboard/AdminPriceUploadWidget";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MLAnalyticsWidget from "@/components/dashboard/MLAnalyticsWidget";

import { t } from "@/lib/i18n";
export default function AdminProcurementPage() {
  return (
    <div className="page-container">
      <PageHeader
        title={t("Smart Procurement")}
        description={t(
          "Upload the HKARTI daily wholesale price PDF. Merchants will use this data for supplier recommendations.",
        )}
      />

      <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-700 leading-relaxed">
        <strong className="text-teal-800">{t("How it works:")}</strong>{" "}
        {t(
          "Upload the daily price bulletin from the Hector Kobbekaduwa Agrarian Research and Training Institute. Once uploaded, merchants can open Procurement from their sidebar and run supplier recommendations — their prices will be benchmarked against the government wholesale average you uploaded here.",
        )}
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
