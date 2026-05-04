"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const TRANSACTION_TYPE_OPTIONS = [
  { label: "Cash Deposit", value: "cash_deposit" },
  { label: "Cash Withdrawal", value: "cash_withdrawal" },
  { label: "Fund Transfer", value: "fund_transfer" },
  { label: "Balance Inquiry", value: "balance_inquiry" },
];

const STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AgencyBankingForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.amount = Number(values.amount || 0);
    values.agent_cash_balance = Number(values.agent_cash_balance || 0);

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Customer Name"
          name="customer_name"
          type="text"
          placeholder="e.g. Nimal Perera"
          required
          defaultValue={initialData.customer_name || ""}
        />

        <Input
          label="Customer Phone"
          name="customer_phone"
          type="text"
          placeholder="e.g. 0771234567"
          required
          defaultValue={initialData.customer_phone || ""}
        />

        <Select
          label="Transaction Type"
          name="transaction_type"
          options={TRANSACTION_TYPE_OPTIONS}
          defaultValue={initialData.transaction_type || "cash_deposit"}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "completed"}
        />

        <Input
          label="Amount (LKR)"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initialData.amount || ""}
        />

        <Input
          label="Current Agent Cash Balance (LKR)"
          name="agent_cash_balance"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initialData.agent_cash_balance || 0}
        />
      </div>

      {/* <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Service fee and merchant commission will be calculated automatically by
        the backend.
      </div> */}

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}