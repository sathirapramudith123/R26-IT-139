"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" }
];

export default function TermVaultForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {}
}) {
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    // Type conversions
    values.member_count = parseInt(values.member_count, 10);
    values.interest_rate = parseFloat(values.interest_rate);
    values.principal_amount = parseFloat(values.principal_amount);

    // ✅ Validation: Member count (1–12)
    if (values.member_count < 1 || values.member_count > 12) {
      setError("Member count must be between 1 and 12");
      return;
    }

    // ✅ Validation: Date logic
    if (values.maturity_date <= values.start_date) {
      setError("Maturity date must be after start date");
      return;
    }

    onSubmit?.(values);
  }

  return (
    <form className="card-elevated max-w-4xl space-y-6" onSubmit={handleSubmit}>
      
      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Input
          label="Vault Name"
          name="name"
          type="text"
          placeholder="e.g. Village Savings Group"
          required
          defaultValue={initialData.name || ""}
        />

        <Input
          label="Member Count"
          name="member_count"
          type="number"
          min="1"
          max="12"
          step="1"
          required
          defaultValue={initialData.member_count || ""}
        />

        <Input
          label="Start Date"
          name="start_date"
          type="date"
          required
          defaultValue={initialData.start_date || ""}
        />

        <Input
          label="Maturity Date"
          name="maturity_date"
          type="date"
          required
          defaultValue={initialData.maturity_date || ""}
        />

        <Input
          label="Interest Rate (%)"
          name="interest_rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 8.50"
          required
          defaultValue={initialData.interest_rate || ""}
        />

        <Input
          label="Principal Amount (LKR)"
          name="principal_amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 50000"
          required
          defaultValue={initialData.principal_amount || ""}
        />

        <Input
          label="Bank / Institution"
          name="bank_institution"
          type="text"
          placeholder="e.g. Bank of Ceylon"
          required
          defaultValue={initialData.bank_institution || ""}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "active"}
        />

      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex justify-end">
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}