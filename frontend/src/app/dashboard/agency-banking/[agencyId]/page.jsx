"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

export default function AgencyBankingDetailPage() {
  const params = useParams();
  const router = useRouter();

  const agencyId =
    params?.agencyId ||
    params?.agentId ||
    params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      if (!agencyId) {
        setLoading(false);
        return;
      }

      try {
        const data = await agencyBankingApi.getById(agencyId);
        setItem(data);
      } catch (err) {
        console.error("Agency banking detail error:", err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [agencyId]);

  async function handleDelete() {
    if (!confirm("Delete this agency banking transaction?")) return;

    try {
      setDeleting(true);
      await agencyBankingApi.remove(agencyId);
      router.push("/dashboard/agency-banking");
    } catch (err) {
      alert(err.message || "Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  }

  function formatMoney(value) {
    return `LKR ${Number(value || 0).toLocaleString()}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Agency Banking Transaction"
        description="View simulated banking transaction, commission, and liquidity details."
        action={
          <Link href="/dashboard/agency-banking">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading agency banking transaction..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">
            Transaction not found. ID: {agencyId || "missing"}
          </p>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-outfit text-2xl font-bold capitalize text-slate-900">
                {String(item.transaction_type || "Agency Transaction").replaceAll(
                  "_",
                  " "
                )}
              </h2>

              <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>

              <p className="mt-1 text-xs text-slate-400">
                Reference: {item.reference_number || "—"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status} />

              <Link href={`/dashboard/agency-banking/${item.id}/edit`}>
                <Button variant="primary" size="sm">
                  Edit
                </Button>
              </Link>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Customer Name" value={item.customer_name || "—"} />
            <Info label="Customer Phone" value={item.customer_phone || "—"} />
            <Info label="Transaction Type" value={item.transaction_type || "—"} />
            <Info label="Status" value={item.status || "—"} />

            <Info label="Amount" value={formatMoney(item.amount)} />
            <Info label="Service Fee" value={formatMoney(item.service_fee)} />
            <Info label="Commission" value={formatMoney(item.commission)} />
            <Info
              label="Agent Cash Balance"
              value={formatMoney(item.agent_cash_balance)}
            />

            <Info label="Reference Number" value={item.reference_number || "—"} />
            <Info label="Created Date" value={formatDate(item.created_at)} />
            <Info label="Updated Date" value={formatDate(item.updated_at)} />
            <Info label="Record ID" value={item.id || "—"} />
          </div>

          {item.transaction_type === "cash_withdrawal" && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Cash withdrawal reduced the merchant agent cash balance.
            </div>
          )}

          {item.transaction_type === "cash_deposit" && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Cash deposit increased the merchant agent cash balance.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold capitalize text-slate-800">
        {String(value).replaceAll("_", " ")}
      </p>
    </div>
  );
}