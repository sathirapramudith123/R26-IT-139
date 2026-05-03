"use client";

import { useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Ordered", value: "ordered" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ProcurementForm({
  onSubmit,
  submitLabel = "Save Decision",
  initialData = {},
  inventoryItems = [],
  suppliers = [],
}) {
  const [selectedItemId, setSelectedItemId] = useState(initialData.item_id || "");
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialData.recommended_supplier_id || ""
  );

  const selectedItem = inventoryItems.find((item) => item.id === selectedItemId);
  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === selectedSupplierId
  );

  const inventoryOptions = useMemo(
    () => [
      { label: "Select item", value: "" },
      ...inventoryItems.map((item) => ({
        label: item.name,
        value: item.id,
      })),
    ],
    [inventoryItems]
  );

  const supplierOptions = useMemo(
    () => [
      { label: "Select supplier", value: "" },
      ...suppliers.map((supplier) => ({
        label: itemLabel(supplier),
        value: supplier.id,
      })),
    ],
    [suppliers]
  );

  function itemLabel(supplier) {
    return `${supplier.name} - Score: ${supplier.total_score ?? 0}`;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    if (!selectedItem) {
      alert("Please select a valid item");
      return;
    }

    if (!selectedSupplier) {
      alert("Please select a valid supplier");
      return;
    }

    values.item_id = selectedItem.id;
    values.item_name = selectedItem.name;

    values.recommended_supplier_id = selectedSupplier.id;
    values.recommended_supplier_name = selectedSupplier.name;

    values.current_quantity = Number(values.current_quantity || 0);
    values.reorder_level = Number(values.reorder_level || 0);
    values.recommended_quantity = Number(values.recommended_quantity || 0);
    values.supplier_score = Number(values.supplier_score || 0);
    values.decision_type = initialData.decision_type || "manual";

    delete values.display_item_id;
    delete values.display_supplier_id;

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Select
          label="Item Name"
          name="item_selector"
          options={inventoryOptions}
          required
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
        />

        <Input
          label="Auto-filled Item ID"
          name="display_item_id"
          type="text"
          readOnly
          value={selectedItem?.id || ""}
        />

        <Input
          label="Current Quantity"
          name="current_quantity"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initialData.current_quantity || selectedItem?.quantity || ""}
        />

        <Input
          label="Reorder Level"
          name="reorder_level"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initialData.reorder_level || selectedItem?.reorder_level || ""}
        />

        <Input
          label="Recommended Quantity"
          name="recommended_quantity"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initialData.recommended_quantity || ""}
        />

        <Select
          label="Recommended Supplier Name"
          name="supplier_selector"
          options={supplierOptions}
          required
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
        />

        <Input
          label="Auto-filled Recommended Supplier ID"
          name="display_supplier_id"
          type="text"
          readOnly
          value={selectedSupplier?.id || ""}
        />

        <Input
          label="Supplier Score"
          name="supplier_score"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          value={selectedSupplier?.total_score ?? initialData.supplier_score ?? 0}
          readOnly
        />

        <div className="md:col-span-2">
          <Input
            label="Decision Reason"
            name="decision_reason"
            type="text"
            required
            defaultValue={initialData.decision_reason || "Manual procurement decision"}
          />
        </div>

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "pending"}
        />
      </div>

      {/*<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Item ID and Supplier ID are automatically filled from the selected item and supplier.
      </div>*/}

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}