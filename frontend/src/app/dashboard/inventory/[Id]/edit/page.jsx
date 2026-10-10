"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import InventoryForm from "@/components/forms/InventoryForm";
import { inventoryApi } from "@/services/api/inventory";

import { t } from "@/lib/i18n";
export default function EditInventoryPage() {
  useAuthGuard();
  const { Id } = useParams(); // ← capital Id, matches [Id] folder
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Id) return;
    inventoryApi
      .getById(Id)
      .then(setItem)
      .catch((e) => setError(e.message || t("Failed to load")))
      .finally(() => setLoading(false));
  }, [Id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Edit Inventory Item")}
        description={t("Update the details.")}
        action={
          <Link href="/dashboard/inventory">
            <Button variant="outline">{t("← Back")}</Button>
          </Link>
        }
      />
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : !item ? (
        <p className="text-soft">{t("Not found.")}</p>
      ) : (
        <InventoryForm initialData={item} itemId={Id} />
      )}
    </div>
  );
}
