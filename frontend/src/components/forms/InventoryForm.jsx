"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const UNIT_OPTIONS = [
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Gram (g)", value: "g" },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Liter (l)", value: "l" },
  { label: "Unit", value: "unit" },
  { label: "Box", value: "box" },
  { label: "Carton", value: "carton" },
];

export default function InventoryForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
  suppliers = [],
}) {
  const supplierOptions = [
    { label: "Select supplier", value: "" },
    ...suppliers.map((supplier) => ({
      label: `${supplier.name} - ${supplier.company_name ?? "N/A"}`,
      value: supplier.id,
    })),
  ];

  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    const selectedSupplier = suppliers.find(
      (supplier) => supplier.id === values.supplier_id
    );

    if (!selectedSupplier) {
      alert("Please select a valid supplier");
      return;
    }

    values.supplier_name = selectedSupplier.name;
    values.quantity = Number(values.quantity);
    values.reorder_level = Number(values.reorder_level);
    values.unit_price = Number(values.unit_price);

    values.sync_status = initialData.sync_status || "synced";
    values.version = initialData.version || 1;
    values.device_id = initialData.device_id || null;
    values.last_synced_at = initialData.last_synced_at || null;

    if (
      Number.isNaN(values.quantity) ||
      Number.isNaN(values.reorder_level) ||
      Number.isNaN(values.unit_price)
    ) {
      alert("Invalid number input");
      return;
    }

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Item Name"
          name="name"
          type="text"
          placeholder="e.g. Rice 5kg bag"
          required
          defaultValue={initialData.name ?? ""}
        />

        <Select
          label="Supplier"
          name="supplier_id"
          options={supplierOptions}
          required
          defaultValue={initialData.supplier_id ?? ""}
        />

        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          required
          defaultValue={initialData.quantity ?? ""}
        />

        <Input
          label="Reorder Level"
          name="reorder_level"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 10"
          required
          defaultValue={initialData.reorder_level ?? ""}
        />

        <Select
          label="Unit"
          name="unit"
          options={UNIT_OPTIONS}
          defaultValue={initialData.unit ?? "kg"}
        />

        <Input
          label="Unit Price (LKR)"
          name="unit_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          required
          defaultValue={initialData.unit_price ?? ""}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Status will be calculated automatically:
        <strong> quantity ≤ reorder level = low stock</strong>, otherwise available.
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}