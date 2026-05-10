"use client";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import TransactionForm from "@/components/forms/TransactionForm";
import { transactionApi } from "@/services/api/transaction.api";

export default function CreateTransactionPage() {
  useAuthGuard();
  const router = useRouter();

  async function handleSubmit(formData) {
    await transactionApi.create(formData);
    router.push("/dashboard/transactions");
  }

  return (
    <div className="page-container">
      <PageHeader
        title="New Transaction"
        description="Add income, expense, deposit, or supplier payment."
        action={
          <Link href="/dashboard/transactions">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />
      <TransactionForm
        onSubmit={handleSubmit}
        submitLabel="Create Transaction"
      />
    </div>
  );
}