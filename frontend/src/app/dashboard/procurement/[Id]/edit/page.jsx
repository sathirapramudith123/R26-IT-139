"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProcurementForm from "@/components/forms/ProcurementForm";
import { procurementApi } from "@/services/api/procurement";

import { t } from "@/lib/i18n";
export default function EditProcurementPage() {
  useAuthGuard();
  const { Id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Id) return;
    procurementApi
      .getById(Id)
      .then(setItem)
      .catch((e) => setError(e.message || t("Failed")))
      .finally(() => setLoading(false));
  }, [Id]);

  return (
    <div className="page-container">
      <PageHeader
        title={t("Edit Procurement")}
        description={t("Update decision details.")}
        action={
          <Link href="/dashboard/procurement">
            <Button variant="secondary">{t("← Back")}</Button>
          </Link>
        }
      />
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !item ? (
        <p className="text-sm text-slate-500">{t("Not found.")}</p>
      ) : (
        <ProcurementForm initialData={item} procurementId={Id} />
      )}
    </div>
  );
}
