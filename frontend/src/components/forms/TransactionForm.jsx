"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const TYPE_OPTIONS = [
  { label: "Sale", value: "sale" },
  { label: "Purchase", value: "purchase" },
  { label: "Transfer", value: "transfer" },
  { label: "Refund", value: "refund" }
];

const STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" }
];

const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Mobile Payment", value: "mobile_payment" }
];

export default function TransactionForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {}
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const values = Object.fromEntries(formData.entries());

    values.amount = parseFloat(values.amount);
    if (!values.notes) values.notes = "";

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      
      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* TYPE */}
        <Select
          label="Transaction Type"
          name="transaction_type"
          options={TYPE_OPTIONS}
          defaultValue={initialData.transaction_type || "sale"}
        />

        {/* STATUS */}
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "completed"}
        />

        {/* AMOUNT */}
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

        {/* DATE */}
        <Input
          label="Date"
          name="date"
          type="date"
          required
          defaultValue={initialData.date || ""}
        />

        {/* PAYMENT METHOD */}
        <Select
          label="Payment Method"
          name="payment_method"
          options={PAYMENT_METHOD_OPTIONS}
          defaultValue={initialData.payment_method || "cash"}
        />

        {/* DESCRIPTION */}
        <Input
          label="Description"
          name="description"
          type="text"
          placeholder="Enter transaction description"
          required
          defaultValue={initialData.description || ""}
        />

        {/* NOTES FULL WIDTH */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={4}
            placeholder="Add extra notes"
            defaultValue={initialData.notes || ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {/* BUTTON RIGHT-ALIGNED */}
      <div className="flex justify-end">
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}