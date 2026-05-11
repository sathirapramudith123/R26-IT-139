"use client";
import { useState, useEffect } from "react";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { isRequired, isPositiveNumber } from "@/lib/validators/index";
import { inventoryApi } from "@/services/api/inventory.api";

const TRANSACTION_TYPES = [
  { value: "sale",     label: "Sale (reduces stock)"  },
  { value: "purchase", label: "Purchase (adds stock)" },
  { value: "expense",  label: "Expense"               },
  { value: "deposit",  label: "Deposit"               },
  { value: "transfer", label: "Transfer"              },
];

const PAYMENT_METHODS = [
  { value: "cash",    label: "Cash"                  },
  { value: "bank",    label: "Bank"                  },
  { value: "digital", label: "QR / Mobile / Digital" },
];

const STOCK_TYPES = new Set(["sale", "purchase"]);

export default function TransactionForm({
  onSubmit,
  submitLabel = "Save",
  initialData = {},
}) {
  const [saving,      setSaving]      = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [inventory,   setInventory]   = useState([]);
  const [values, setValues] = useState({
    transaction_type: initialData.transaction_type ?? "sale",
    description:      initialData.description      ?? "",
    amount:           initialData.amount           ?? "",
    payment_method:   initialData.payment_method   ?? "cash",
    category:         initialData.category         ?? "",
    item_name:        initialData.item_name        ?? "",
    quantity:         initialData.quantity         ?? "",
    unit_price:       initialData.unit_price       ?? "",
    date:             initialData.date
      ? String(initialData.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    inventoryApi.list()
      .then(items => setInventory(Array.isArray(items) ? items : []))
      .catch(() => setInventory([]));
  }, []);

  const showStockFields = STOCK_TYPES.has(values.transaction_type);
  const isSale          = values.transaction_type === "sale";

  function set(k, v) {
    setValues(p => {
      const next = { ...p, [k]: v };
      // Auto-calculate amount when qty or unit_price changes
      if (k === "quantity" || k === "unit_price") {
        const qty   = parseFloat(k === "quantity"   ? v : next.quantity)   || 0;
        const price = parseFloat(k === "unit_price" ? v : next.unit_price) || 0;
        if (qty > 0 && price > 0) next.amount = (qty * price).toFixed(2);
      }
      // When item selected, pre-fill unit_price from inventory cost_price
      if (k === "item_name") {
        const found = inventory.find(i => i.name === v);
        if (found?.cost_price) {
          next.unit_price = String(found.cost_price);
          const qty = parseFloat(next.quantity) || 0;
          if (qty > 0) next.amount = (qty * found.cost_price).toFixed(2);
        }
      }
      return next;
    });
    setFieldErrors(p => ({ ...p, [k]: undefined }));
  }

  function validate() {
    const e = {};
    if (!isRequired(values.transaction_type))
      e.transaction_type = "Select a transaction type.";
    if (!isPositiveNumber(values.amount))
      e.amount = "Enter an amount greater than 0.";
    if (showStockFields && values.item_name && !isPositiveNumber(values.quantity))
      e.quantity = "Enter a valid quantity.";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setSaving(true);
    const payload = {
      transaction_type: values.transaction_type,
      payment_method:   values.payment_method,
      amount:           Number(values.amount),
      date:             values.date || undefined,
    };
    if (values.description?.trim()) payload.description = values.description.trim();
    if (values.category)            payload.category    = values.category;
    if (showStockFields && values.item_name) {
      payload.item_name  = values.item_name;
      payload.quantity   = values.quantity   ? Number(values.quantity)   : undefined;
      payload.unit_price = values.unit_price ? Number(values.unit_price) : undefined;
    }
    try { await onSubmit(payload); }
    finally { setSaving(false); }
  }

  const cls = k =>
    `input-field ${fieldErrors[k]
      ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100"
      : ""}`;

  const qty   = parseFloat(values.quantity)   || 0;
  const price = parseFloat(values.unit_price) || 0;
  const total = qty > 0 && price > 0 ? qty * price : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Transaction Type" error={fieldErrors.transaction_type} required>
          <select className="select-field" value={values.transaction_type}
            onChange={e => set("transaction_type", e.target.value)}>
            {TRANSACTION_TYPES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Date">
          <input className="input-field" type="date" value={values.date}
            onChange={e => set("date", e.target.value)} />
        </FormField>

        <FormField label="Payment Method">
          <select className="select-field" value={values.payment_method}
            onChange={e => set("payment_method", e.target.value)}>
            {PAYMENT_METHODS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Description" hint="Optional">
            <input className="input-field" value={values.description}
              onChange={e => set("description", e.target.value)}
              placeholder="e.g. Rice sold to customer, Electricity bill..." />
          </FormField>
        </div>
      </div>

      {/* ── Bill section — sale / purchase only ── */}
      {showStockFields && (
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-5 space-y-4">
          <p className="text-sm font-semibold text-teal-800">
            {isSale ? "🧾 Bill — Sale" : "🧾 Bill — Purchase"}
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <FormField
              label={isSale ? "Item sold" : "Item purchased"}
              hint="Selecting an item auto-fills the unit price"
            >
              <select className="select-field" value={values.item_name}
                onChange={e => set("item_name", e.target.value)}>
                <option value="">— Select inventory item —</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name}>
                    {item.name} (stock: {item.quantity} {item.unit || "units"})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Quantity"
              error={fieldErrors.quantity}
              hint={values.item_name
                ? (isSale ? "Stock will reduce by this amount" : "Stock will increase by this amount")
                : "Select an item first"}
            >
              <input className={cls("quantity")} type="number" min="0.01" step="0.01"
                value={values.quantity}
                onChange={e => set("quantity", e.target.value)}
                placeholder="e.g. 5"
                disabled={!values.item_name} />
            </FormField>

            <FormField
              label={isSale ? "Selling price per unit (LKR)" : "Cost price per unit (LKR)"}
              hint="Amount = Qty × Unit price"
            >
              <input className="input-field" type="number" min="0.01" step="0.01"
                value={values.unit_price}
                onChange={e => set("unit_price", e.target.value)}
                placeholder="e.g. 120.00"
                disabled={!values.item_name} />
            </FormField>

            <FormField label="Total amount (LKR)" error={fieldErrors.amount} required>
              <input className={cls("amount")} type="number" min="0.01" step="0.01"
                value={values.amount}
                onChange={e => set("amount", e.target.value)}
                placeholder="Auto-calculated or enter manually" />
            </FormField>
          </div>

          {/* Bill preview */}
          {values.item_name && qty > 0 && price > 0 && (
            <div className="rounded-lg bg-white border border-teal-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-teal-800 text-sm mb-2">
                {isSale ? "🧾 Sale Receipt Preview" : "🧾 Purchase Receipt Preview"}
              </p>
              <div className="flex justify-between text-slate-600">
                <span>Item</span>
                <span className="font-medium">{values.item_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Quantity</span>
                <span className="font-medium">{qty}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unit price</span>
                <span className="font-medium">LKR {price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-teal-800 border-t border-teal-100 pt-1 mt-1">
                <span>Total</span>
                <span>LKR {total.toLocaleString()}</span>
              </div>
              <p className="text-slate-400 pt-1">
                {isSale
                  ? `${qty} units of "${values.item_name}" will be deducted from stock`
                  : `${qty} units of "${values.item_name}" will be added to stock`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Amount for non-stock transactions */}
      {!showStockFields && (
        <FormField label="Amount (LKR)" error={fieldErrors.amount} required>
          <input className={cls("amount")} type="number" min="0.01" step="0.01"
            value={values.amount} onChange={e => set("amount", e.target.value)}
            placeholder="0.00" />
        </FormField>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}