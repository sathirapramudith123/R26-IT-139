"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { transactionApi } from "@/services/api/transaction";
import { inventoryApi } from "@/services/api/inventory";
import { TRANSACTION_TYPES, PAYMENT_METHODS } from "@/lib/constants";

export default function TransactionForm({ initialData = {}, txId = null }) {
  const router = useRouter();
  const isEdit = !!txId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [items, setItems] = useState([]);

  const [v, setV] = useState({
    transaction_type: initialData.transaction_type ?? "sale",
    payment_method:   initialData.payment_method   ?? "cash",
    amount:           initialData.amount           ?? "",
    item_name:        initialData.item_name        ?? "",
    quantity:         initialData.quantity         ?? "",
    category:         initialData.category         ?? "",
    description:      initialData.description      ?? "",
  });
  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  useEffect(() => {
    inventoryApi.list().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]));
  }, []);

  const isSale = v.transaction_type === "sale";
  const selected = items.find(i => i.name === v.item_name);

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.amount || Number(v.amount) <= 0) er.amount = "Enter an amount greater than 0.";
    if (isSale && v.item_name && (!v.quantity || Number(v.quantity) <= 0))
      er.quantity = "Enter how many units were sold.";
    if (isSale && selected && Number(v.quantity) > Number(selected.quantity))
      er.quantity = `Only ${selected.quantity} in stock.`;
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true); setServerError(null);
    const payload = {
      ...v,
      amount: Number(v.amount),
      item_name: isSale && v.item_name ? v.item_name : null,
      quantity: isSale && v.quantity !== "" ? Number(v.quantity) : null,
    };
    try {
      if (isEdit) await transactionApi.update(txId, payload);
      else await transactionApi.create(payload);
      router.push("/dashboard/transactions");
    } catch (err) { setServerError(err.message || "Save failed."); }
    finally { setSaving(false); }
  }

  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Transaction Type" required>
          <select className="select-field" value={v.transaction_type} onChange={e => set("transaction_type", e.target.value)}>
            {TRANSACTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Payment Method" required>
          <select className="select-field" value={v.payment_method} onChange={e => set("payment_method", e.target.value)}>
            {PAYMENT_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        {isSale && (
          <>
            <FormField label="Item Sold" hint={items.length === 0 ? "No inventory items yet." : "Stock is deducted automatically"}>
              <select className="select-field" value={v.item_name} onChange={e => set("item_name", e.target.value)}>
                <option value="">No specific item</option>
                {items.map(i => (
                  <option key={i.id} value={i.name}>{i.name} ({i.quantity} in stock)</option>
                ))}
              </select>
            </FormField>

            <FormField label="Units Sold" error={errors.quantity}
              hint={selected ? `${selected.quantity} available` : "Select an item first"}>
              <input className={cls("quantity")} type="number" min="0.01" step="0.01"
                value={v.quantity} onChange={e => set("quantity", e.target.value)} disabled={!v.item_name} />
            </FormField>
          </>
        )}

        <FormField label="Amount (LKR)" error={errors.amount} required>
          <input className={cls("amount")} type="number" min="0.01" step="0.01"
            value={v.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
        </FormField>

        <FormField label="Category" hint="Optional">
          <input className="input-field" value={v.category} onChange={e => set("category", e.target.value)} placeholder="e.g. sales" />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Description" hint="Optional">
            <input className="input-field" value={v.description} onChange={e => set("description", e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/transactions"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update" : "Create")}</Button>
      </div>
    </form>
  );
}