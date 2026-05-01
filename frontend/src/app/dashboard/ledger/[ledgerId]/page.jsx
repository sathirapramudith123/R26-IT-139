"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LedgerCard from "@/components/ledger/LedgerCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Card from "@/components/ui/Card";
import { ledgerApi } from "@/services/api/ledger.api";

export default function LedgerDetailPage({ params }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ledgerApi.getById(params.ledgerId)
      .then(setItem).catch(() => setItem(null)).finally(() => setLoading(false));
  }, [params.ledgerId]);

  return (
    <div className="page-container">
      <PageHeader title="Ledger Entry" description="Full details for this ledger record."
        action={<Link href="/dashboard/ledger"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : !item ?
        <Card><p className="text-slate-500">Entry not found. ID: {params.ledgerId}</p></Card> :
        <div className="max-w-xl"><LedgerCard item={item} /></div>
      }
    </div>
  );
}
