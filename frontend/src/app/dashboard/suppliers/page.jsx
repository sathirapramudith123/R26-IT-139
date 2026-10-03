"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useSuppliers from "@/hooks/useSuppliers";
import { supplierApi } from "@/services/api/supplier";
import DetailDialog from "@/components/common/DetailDialog";

import { t } from "@/lib/i18n";
const COLS = [
  {
    key: "name",
    get label() {
      return t("Supplier");
    },
  },
  {
    key: "company_name",
    get label() {
      return t("Company");
    },
  },
  {
    key: "contact_number",
    get label() {
      return t("Contact");
    },
  },
  {
    key: "items_summary",
    get label() {
      return t("Items");
    },
  },
  {
    key: "status",
    get label() {
      return t("Status");
    },
  },
  { key: "actions", label: "" },
];

export default function SuppliersPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useSuppliers();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;
    try {
      await supplierApi.remove(id);
      await fetchAll();
    } catch (e) {
      alert(e.message || t("Failed"));
    }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw
      ? items
      : items.filter((i) => [i.name, i.company_name, i.contact_number].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map((item) => {
    // Prices are per item (inside items_supplied), so the list shows how many items a
    // supplier carries instead of a single price ("—" when none).
    const itemCount = Array.isArray(item.items_supplied) ? item.items_supplied.length : 0;
    return {
      ...item,
      company_name: item.company_name ?? "—",
      items_summary: itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "—",
      status: <StatusBadge status={item.status} />,
      actions: (
        <div className="flex gap-2">
          <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>
            {t("View")}
          </Button>
          <Link href={`/dashboard/suppliers/${item.id}/edit`}>
            <Button variant="secondary" size="sm">
              {t("Edit")}
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
            {t("Delete")}
          </Button>
        </div>
      ),
    };
  });

  return (
    <div className="page-container">
      <PageHeader
        title={t("Suppliers")}
        description={t("Manage supplier details.")}
        action={
          <Link href="/dashboard/suppliers/create">
            <Button>{t("+ Add Supplier")}</Button>
          </Link>
        }
      />
      <Card className="mb-4">
        <input
          type="text"
          placeholder={t("Search by name, company, contact...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </Card>
      {loading ? (
        <LoadingSpinner label={t("Loading suppliers...")} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={t("No suppliers")}
          description={t("Add your first supplier.")}
          action={
            <Link href="/dashboard/suppliers/create">
              <Button>{t("Add Supplier")}</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLS} rows={rows} />
      )}
      <DetailDialog
        open={!!viewItem}
        title={viewItem?.name || t("Procument")}
        data={viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}
