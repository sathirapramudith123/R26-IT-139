"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import TransactionForm from "@/components/forms/TransactionForm";

import { t } from "@/lib/i18n";
export default function CreateTransactionPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader
        title={t("New Transaction")}
        description={t("Record income, expense, or payment.")}
        action={
          <Link href="/dashboard/transactions">
            <Button variant="secondary">{t("← Back")}</Button>
          </Link>
        }
      />
      <TransactionForm />
    </div>
  );
}
