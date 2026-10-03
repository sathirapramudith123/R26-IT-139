"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import InventoryForm from "@/components/forms/InventoryForm";

import { t } from "@/lib/i18n";
export default function CreateInventoryPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader
        title={t("Add Inventory Item")}
        description={t("Add a new stock item.")}
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">{t("← Back")}</Button>
          </Link>
        }
      />
      <InventoryForm />
    </div>
  );
}
