"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useSuppliers from "@/hooks/useSuppliers";
import { supplierApi } from "@/services/api/supplier.api";

const COLUMNS = [
  { key: "name", label: "Supplier Name" },
  { key: "company_name", label: "Company" },
  { key: "contact_number", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" }
];

export default function SuppliersPage() {
  const { items, loading, error, fetchAll } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // DELETE
  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;

    try {
      setDeletingId(id);
      await supplierApi.remove(id);
      await fetchAll();
    } catch (err) {
      alert(err.message || "Failed to delete supplier");
    } finally {
      setDeletingId(null);
    }
  }

  // FILTER LOGIC
  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.company_name?.toLowerCase().includes(keyword) ||
        item.contact_number?.toLowerCase().includes(keyword) ||
        item.email?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  // TABLE ROWS
  const rows = filteredItems.map((item) => ({
    ...item,
    company_name: item.company_name ?? "N/A",
    email: item.email ?? "N/A",
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex gap-2">
        <Link href={`/dashboard/suppliers/${item.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>

        <Link href={`/dashboard/suppliers/${item.id}/edit`}>
          <Button variant="secondary" size="sm">Edit</Button>
        </Link>

        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDelete(item.id)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? "Deleting..." : "Delete"}
        </Button>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Suppliers"
        description="Manage supplier details and relationships."
        action={
          <Link href="/dashboard/suppliers/create">
            <Button>+ Add Supplier</Button>
          </Link>
        }
      />

      {/* 🔍 SEARCH + FILTER */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* SEARCH */}
          <div className="w-full lg:max-w-md">
            <input
              type="text"
              placeholder="Search by name, company, contact, email, status, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </div>

          {/* FILTER */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="blacklisted">Blacklisted</option>
            </select>

            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* CONTENT */}
      {loading ? (
        <LoadingSpinner label="Loading suppliers..." />
      ) : error ? (
        <Card><p className="text-red-600">{error}</p></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No suppliers"
          description="Add your first supplier."
          action={
            <Link href="/dashboard/suppliers/create">
              <Button>Add Supplier</Button>
            </Link>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching suppliers"
          description="Try different search or filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}