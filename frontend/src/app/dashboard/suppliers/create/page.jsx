"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import SupplierForm from "@/components/forms/SupplierForm";

import { t } from "@/lib/i18n";
export default function CreateSupplierPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader
        title={t("Add Supplier")}
        description={t("Register a new supplier.")}
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">{t("← Back")}</Button>
          </Link>
        }
      />
      <SupplierForm />
    </div>
  );
}
