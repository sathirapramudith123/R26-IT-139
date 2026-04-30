"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" }
];

const UNIT_OPTIONS = [
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Gram (g)", value: "g" },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Liter (l)", value: "l" },
  { label: "Meter (m)", value: "m" },
  { label: "Box", value: "box" },
  { label: "Carton", value: "carton" },
  { label: "Roll", value: "roll" },
  { label: "Pair", value: "pair" }
];

export default function InventoryForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
  suppliers = []
}) {
  const supplierOptions = [
    { label: "Select supplier", value: "" },
    ...suppliers.map((supplier) => ({
      label: `${supplier.name} - ${supplier.company_name ?? "N/A"}`,
      value: supplier.id
    }))
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
    values.unit_price = Number(values.unit_price);

    if (Number.isNaN(values.quantity) || Number.isNaN(values.unit_price)) {
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

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status ?? "active"}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}