"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" },
];

export default function SupplierForm({
  onSubmit,
  submitLabel = "Save Supplier",
  initialData = {},
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.price_score = Number(values.price_score || 0);
    values.reliability_score = Number(values.reliability_score || 0);
    values.delivery_score = Number(values.delivery_score || 0);

    values.unit_price = Number(values.unit_price || 0);
    values.delivery_cost = Number(values.delivery_cost || 0);
    values.available_quantity = Number(values.available_quantity || 0);

    if (values.estimated_delivery_date) {
      values.estimated_delivery_date = new Date(
        values.estimated_delivery_date
      ).toISOString();
    } else {
      values.estimated_delivery_date = null;
    }

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Supplier Name"
          name="name"
          type="text"
          placeholder="e.g. John Perera"
          required
          defaultValue={initialData.name || ""}
        />

        <Input
          label="Company Name"
          name="company_name"
          type="text"
          placeholder="e.g. Colombo Wholesale Traders"
          required
          defaultValue={initialData.company_name || ""}
        />

        <Input
          label="Contact Number"
          name="contact_number"
          type="text"
          placeholder="0771234567 or +94771234567"
          required
          defaultValue={initialData.contact_number || ""}
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="e.g. supplier@email.com"
          required
          defaultValue={initialData.email || ""}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status || "active"}
        />

        <Input
          label="Estimated Delivery Date"
          name="estimated_delivery_date"
          type="date"
          defaultValue={
            initialData.estimated_delivery_date
              ? String(initialData.estimated_delivery_date).slice(0, 10)
              : ""
          }
        />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Address
          </label>
          <textarea
            name="address"
            rows={4}
            placeholder="Enter supplier address"
            defaultValue={initialData.address || ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-4 font-outfit text-lg font-semibold text-slate-900">
          Procurement Details
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Input
            label="Unit Price (LKR)"
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 130"
            required
            defaultValue={initialData.unit_price ?? ""}
          />

          <Input
            label="Delivery Cost (LKR)"
            name="delivery_cost"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 400"
            required
            defaultValue={initialData.delivery_cost ?? ""}
          />

          <Input
            label="Available Quantity"
            name="available_quantity"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1000"
            required
            defaultValue={initialData.available_quantity ?? ""}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-4 font-outfit text-lg font-semibold text-slate-900">
          Supplier Performance Scores
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Input
            label="Price Score"
            name="price_score"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0 - 100"
            defaultValue={initialData.price_score ?? 0}
          />

          <Input
            label="Reliability Score"
            name="reliability_score"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0 - 100"
            defaultValue={initialData.reliability_score ?? 0}
          />

          <Input
            label="Delivery Score"
            name="delivery_score"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0 - 100"
            defaultValue={initialData.delivery_score ?? 0}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}