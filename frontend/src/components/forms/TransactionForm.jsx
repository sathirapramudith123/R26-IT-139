"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const TYPE_OPTIONS = [
  { label: "Sales", value: "sales" },
  { label: "Supplier Payment", value: "supplier_payment" },
  { label: "Expense", value: "expense" },
  { label: "Agency Banking", value: "agency_banking" },
  { label: "Cash Deposit", value: "cash_deposit" },
];

const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "QR Payment", value: "qr_payment" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Mobile Payment", value: "mobile_payment" },
];

const STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

function getMachineDateTime() {
  const now = new Date();

  return now.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.amount = Number(values.amount || 0);
    values.notes = values.notes || "";

    // Backend automatically saves machine/system date & time
    delete values.date;

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Select
          label="Transaction Type"
          name="transaction_type"
          options={TYPE_OPTIONS}
          defaultValue={initialData.transaction_type || "sale"}
        />

        <Input
          label="Amount (LKR)"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="e.g. 1000.00"
          defaultValue={initialData.amount || ""}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Date & Time
          </label>
          <input
            type="text"
            value={getMachineDateTime()}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
          />
        </div>

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

        <div className="md:col-span-2">
          <Input
            label="Description"
            name="description"
            type="text"
            required
            placeholder="e.g. Daily sales income"
            defaultValue={initialData.description || ""}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={initialData.notes || ""}
            placeholder="e.g. Include any additional details about the transaction here."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}