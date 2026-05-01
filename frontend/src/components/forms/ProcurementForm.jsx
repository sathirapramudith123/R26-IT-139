"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

export default function ProcurementForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.current_quantity = Number(values.current_quantity || 0);
    values.reorder_level = Number(values.reorder_level || 0);
    values.recommended_quantity = Number(values.recommended_quantity || 0);
    values.supplier_score = Number(values.supplier_score || 0);

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-xl space-y-5">
      <Input
        label="Item ID"
        name="item_id"
        type="text"
        required
        defaultValue={initialData.item_id}
      />

      <Input
        label="Item Name"
        name="item_name"
        type="text"
        required
        defaultValue={initialData.item_name}
      />

      <Input
        label="Current Quantity"
        name="current_quantity"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={initialData.current_quantity}
      />

      <Input
        label="Reorder Level"
        name="reorder_level"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={initialData.reorder_level}
      />

      <Input
        label="Recommended Quantity"
        name="recommended_quantity"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={initialData.recommended_quantity}
      />

      <Input
        label="Recommended Supplier ID"
        name="recommended_supplier_id"
        type="text"
        defaultValue={initialData.recommended_supplier_id}
      />

      <Input
        label="Recommended Supplier Name"
        name="recommended_supplier_name"
        type="text"
        defaultValue={initialData.recommended_supplier_name}
      />

      <Input
        label="Supplier Score"
        name="supplier_score"
        type="number"
        min="0"
        step="0.01"
        defaultValue={initialData.supplier_score || 0}
      />

      <Input
        label="Decision Reason"
        name="decision_reason"
        type="text"
        required
        defaultValue={initialData.decision_reason}
      />

      <Select
        label="Status"
        name="status"
        options={STATUS_OPTIONS}
        defaultValue={initialData.status || "pending"}
      />

      <input
        type="hidden"
        name="decision_type"
        value={initialData.decision_type || "manual"}
      />

      <Button type="submit" className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}