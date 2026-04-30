"use client";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active",    value: "active" },
  { label: "Pending",   value: "pending" },
  { label: "Completed", value: "completed" }
];

export default function SavingsForm({ onSubmit, submitLabel = "Save", initialData = {} }) {
  function handleSubmit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    values.balance = parseFloat(values.balance);
    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated space-y-5 max-w-xl">
      <Input label="Savings Goal Name" name="target_name" type="text" placeholder="e.g. Festival Savings 2026" required defaultValue={initialData.target_name} />
      <Input label="Opening Balance (LKR)" name="balance" type="number" min="0" step="0.01" placeholder="0.00" required defaultValue={initialData.balance} />
      <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={initialData.status || "active"} />
      <Button type="submit" className="w-full sm:w-auto">{submitLabel}</Button>
    </form>
  );
}
