"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import ProcurementForm from "@/components/forms/ProcurementForm";

import { t } from "@/lib/i18n";
export default function CreateProcurementPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader
        title={t("New Procurement Decision")}
        description={t("Record a procurement decision.")}
        action={
          <Link href="/dashboard/procurement">
            <Button variant="secondary">{t("← Back")}</Button>
          </Link>
        }
      />
      <ProcurementForm />
    </div>
  );
}
