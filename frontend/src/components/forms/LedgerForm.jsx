"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { ledgerApi } from "@/services/api/ledger.api";

const ENTRY_TYPES = [
  { label: "Income",  value: "income"  },
  { label: "Expense", value: "expense" },
];
const CATEGORIES = [
  { label: "Sales",            value: "sales"            },
  { label: "Agency Banking",   value: "agency_banking"   },
  { label: "Supplier Payment", value: "supplier_payment" },
  { label: "Utilities",        value: "utilities"        },
  { label: "Rent",             value: "rent"             },
  { label: "General",          value: "general"          },
];
const PAYMENTS = [
  { label: "Cash",    value: "cash"    },
  { label: "Bank",    value: "bank"    },
  { label: "Digital", value: "digital" },
];

function validate(v) {
  const e = {};
  if (!v.title?.trim())                        e.title      = "Title is required.";
  if (!v.amount || Number(v.amount) <= 0)      e.amount     = "Enter an amount greater than 0.";
  if (!v.entry_type)                           e.entry_type = "Select an entry type.";
  return e;
}

export default function LedgerForm({ initialData = {}, ledgerId = null }) {
  const router = useRouter();
  const isEdit = !!ledgerId;
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    title:          initialData.title          ?? "",
    amount:         initialData.amount         ?? "",
    entry_type:     initialData.entry_type     ?? "income",
    category:       initialData.category       ?? "general",
    payment_method: initialData.payment_method ?? "cash",
  });

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true); setServerError(null);
    const payload = { ...values, amount: Number(values.amount) };
    try {
      if (isEdit) {
        await ledgerApi.update(ledgerId, payload);
        router.push(`/dashboard/ledger/${ledgerId}`);
      } else {
        await ledgerApi.create(payload);
        router.push("/dashboard/ledger");
      }
    } catch (err) {
      setServerError(err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Title" error={fieldErrors.title} required>
          <input className={cls("title")} value={values.title}
            onChange={e => set("title", e.target.value)}
            placeholder="e.g. Daily sales income" />
        </FormField>

        <FormField label="Amount (LKR)" error={fieldErrors.amount} required>
          <input className={cls("amount")} type="number" min="0.01" step="0.01"
            value={values.amount} onChange={e => set("amount", e.target.value)}
            placeholder="0.00" />
        </FormField>

        <FormField label="Entry Type" error={fieldErrors.entry_type} required>
          <select className={cls("entry_type")} value={values.entry_type}
            onChange={e => set("entry_type", e.target.value)}>
            {ENTRY_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Category">
          <select className="select-field" value={values.category}
            onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Payment Method">
          <select className="select-field" value={values.payment_method}
            onChange={e => set("payment_method", e.target.value)}>
            {PAYMENTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/ledger">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update Entry" : "Create Entry")}
        </Button>
      </div>
    </form>
  );
}