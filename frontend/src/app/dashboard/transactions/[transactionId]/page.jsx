"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { transactionApi } from "@/services/api/transaction.api";

export default function DetailPage({ params }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactionApi.getById(params.transactionId)
      .then(setItem).catch(() => setItem(null)).finally(() => setLoading(false));
  }, [params.transactionId]);

  return (
    <div className="page-container">
      <PageHeader title="Transaction" description="Full details for this record."
        action={<Link href="/dashboard/transactions"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : !item ?
        <Card><p className="text-slate-500">Record not found. ID: {params.transactionId}</p></Card> :
        <Card className="max-w-xl">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="font-outfit text-xl font-bold text-slate-900">
              {item.title ?? item.name ?? item.target_name ?? item.transaction_type ?? "Record"}
            </h2>
            {item.status && <StatusBadge status={item.status} />}
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <pre className="text-xs text-slate-600 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        </Card>
      }
    </div>
  );
}
