"use client";

import { useEffect } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

const COLUMNS = [
  { key: "customer_name", label: "Customer" },
  { key: "transaction_type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "service_fee", label: "Fee" },
  { key: "commission", label: "Commission" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export default function AgencyBankingPage() {
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this agency banking transaction?")) return;

    try {
      await agencyBankingApi.delete(id);
      await fetchAll();
    } catch (err) {
      alert(err.message || "Failed to delete agency transaction");
    }
  }

  const rows = items.map((item) => ({
    ...item,
    transaction_type: item.transaction_type?.replaceAll("_", " "),
    amount: `LKR ${Number(item.amount || 0).toLocaleString()}`,
    service_fee: `LKR ${Number(item.service_fee || 0).toLocaleString()}`,
    commission: `LKR ${Number(item.commission || 0).toLocaleString()}`,
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/dashboard/agency-banking/${item.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>

        <Link href={`/dashboard/agency-banking/${item.id}/edit`}>
          <Button variant="primary" size="sm">
            Edit
          </Button>
        </Link>

        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
          Delete
        </Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Simulated Agency Banking"
        description="Prototype workflow for merchant-based banking touchpoints."
        action={
          <Link href="/dashboard/agency-banking/create">
            <Button>+ New Agency Transaction</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-slate-500">Transactions</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              {summary.total_transactions}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Total Amount</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              LKR {Number(summary.total_amount || 0).toLocaleString()}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Service Fees</p>
            <h3 className="mt-2 text-2xl font-bold text-blue-600">
              LKR {Number(summary.total_service_fees || 0).toLocaleString()}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Merchant Commission</p>
            <h3 className="mt-2 text-2xl font-bold text-green-600">
              LKR {Number(summary.total_commission || 0).toLocaleString()}
            </h3>
          </Card>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading agency banking transactions..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="No agency banking transactions"
          description="Create a simulated banking transaction for the merchant."
          action={
            <Link href="/dashboard/agency-banking/create">
              <Button>New Transaction</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}