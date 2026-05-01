"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Blacklisted", value: "blacklisted" }
];

const PHONE_REGEX = /^(07[01245678][0-9]{7}|\+947[01245678][0-9]{7})$/;

export default function SupplierForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {}
}) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.name = values.name?.trim();
    values.company_name = values.company_name?.trim();
    values.contact_number = values.contact_number?.trim();
    values.email = values.email?.trim();
    values.address = values.address?.trim();

    if (!PHONE_REGEX.test(values.contact_number)) {
      alert(
        "Invalid contact number.\n\nUse a valid Sri Lankan mobile number:\n0771234567\n+94771234567"
      );
      return;
    }

    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Supplier Name"
          name="name"
          type="text"
          placeholder="e.g. John Perera"
          required
          defaultValue={initialData.name ?? ""}
        />

        <Input
          label="Company Name"
          name="company_name"
          type="text"
          placeholder="e.g. Colombo Wholesale Traders"
          required
          defaultValue={initialData.company_name ?? ""}
        />

        <Input
          label="Contact Number"
          name="contact_number"
          type="tel"
          placeholder="0771234567 or +94771234567"
          required
          pattern="^(07[01245678][0-9]{7}|\+947[01245678][0-9]{7})$"
          title="Enter a valid Sri Lankan mobile number. Example: 0771234567 or +94771234567"
          defaultValue={initialData.contact_number ?? ""}
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="e.g. supplier@email.com"
          required
          defaultValue={initialData.email ?? ""}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initialData.status ?? "active"}
        />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Address
          </label>
          <textarea
            name="address"
            rows={3}
            placeholder="Enter supplier address"
            defaultValue={initialData.address ?? ""}
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