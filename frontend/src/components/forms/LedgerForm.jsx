"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const TYPE_OPTIONS = [
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

const CATEGORY_OPTIONS = [
  { label: "Sales", value: "sales" },
  { label: "Supplier Payment", value: "supplier_payment" },
  { label: "Expense", value: "expense" },
  { label: "Agency Banking", value: "agency_banking" },
  { label: "Cash Deposit", value: "cash_deposit" },
  { label: "QR Payment", value: "qr_payment" },
];

const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "QR Payment", value: "qr_payment" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Mobile Payment", value: "mobile_payment" },
];

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

export default function LedgerForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.amount = Number(values.amount || 0);
    values.source_transaction_id = values.source_transaction_id || null;

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Title"
          name="title"
          type="text"
          placeholder="e.g. Daily sales income"
          required
          defaultValue={initialData.title || ""}
        />

        <Input
          label="Amount (LKR)"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          required
          defaultValue={initialData.amount || ""}
        />

        <Select
          label="Entry Type"
          name="entry_type"
          options={TYPE_OPTIONS}
          defaultValue={initialData.entry_type || "income"}
        />

        <Select
          label="Category"
          name="category"
          options={CATEGORY_OPTIONS}
          defaultValue={initialData.category || "sales"}
        />

        <Select
          label="Payment Method"
          name="payment_method"
          options={PAYMENT_METHOD_OPTIONS}
          defaultValue={initialData.payment_method || "cash"}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "completed"}
        />
      </div>

      <input
        type="hidden"
        name="source_transaction_id"
        value={initialData.source_transaction_id || ""}
      />

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}