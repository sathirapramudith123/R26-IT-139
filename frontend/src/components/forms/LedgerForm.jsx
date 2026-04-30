"use client";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const TYPE_OPTIONS = [
  { label: "Income",  value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Transfer",value: "transfer" }
];
const STATUS_OPTIONS = [
  { label: "Pending",   value: "pending" },
  { label: "Active",    value: "active" },
  { label: "Completed", value: "completed" }
];

export default function LedgerForm({ onSubmit, submitLabel = "Save", initialData = {} }) {
  function handleSubmit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    values.amount = parseFloat(values.amount);
    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated space-y-5 max-w-xl">
      <Input label="Title" name="title" type="text" placeholder="e.g. Daily sales income" required defaultValue={initialData.title} />
      <Input label="Amount (LKR)" name="amount" type="number" min="0" step="0.01" placeholder="0.00" required defaultValue={initialData.amount} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Entry Type" name="entry_type" options={TYPE_OPTIONS} defaultValue={initialData.entry_type || "income"} />
        <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={initialData.status || "pending"} />
      </div>
      <Button type="submit" className="w-full sm:w-auto">{submitLabel}</Button>
    </form>
  );
}
