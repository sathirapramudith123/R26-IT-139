"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import TransactionForm from "@/components/forms/TransactionForm";

export default function CreateTransactionPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="New Transaction" description="Record income, expense, or payment."
        action={<Link href="/dashboard/transactions"><Button variant="secondary">← Back</Button></Link>} />
      <TransactionForm />
    </div>
  );
}