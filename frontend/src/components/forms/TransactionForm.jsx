"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { transactionApi } from "@/services/api/transaction";
import { inventoryApi } from "@/services/api/inventory";
import { TRANSACTION_TYPES, PAYMENT_METHODS } from "@/lib/constants";

const TYPE_CONFIG = {
  sale:     { mode: "items"                                  },
  purchase: { mode: "items"                                  },
  expense:  { mode: "simple", category: true,  description: true   },
  deposit:  { mode: "simple", category: false, description: true   },
  transfer: { mode: "simple", category: false, description: true   },
};

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
    item_name:        "", // picker only
    quantity:         "", // picker only
    category:         initialData.category         ?? "",
    description:      initialData.description      ?? "",
  });

  const [cart, setCart] = useState(
    (initialData.items ?? []).map(l => ({
      item_name: l.item_name, quantity: Number(l.quantity), unit_price: 0, amount: 0,
    }))
  );

  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  const type       = v.transaction_type;
  const cfg        = TYPE_CONFIG[type] ?? { mode: "simple", category: true, description: true };
  const usesItems  = cfg.mode === "items";
  const isSale     = type === "sale";
  const isPurchase = type === "purchase";
  const picked     = items.find(i => i.name === v.item_name);
  const total      = cart.reduce((s, l) => s + l.amount, 0);

  function priceOf(item) {
    const p = isPurchase
      ? (item.cost_price ?? item.price ?? item.unit_price)
      : (item.selling_price ?? item.price ?? item.unit_price);
    return parseFloat(p) || 0;
  }

  function changeType(val) {
    set("transaction_type", val);
    set("item_name", "");
    set("quantity", "");
    set("amount", "");
    setCart([]);
  }

  useEffect(() => {
    inventoryApi.list().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !items.length) return;
    setCart(prev => prev.map(l => {
      if (l.unit_price) return l;
      const inv = items.find(i => i.name === l.item_name);
      const price = inv ? priceOf(inv) : 0;
      return { ...l, unit_price: price, amount: +(l.quantity * price).toFixed(2) };
    }));
  }, [items, isEdit]);

  // Keep Amount (LKR) in sync with the cart total
  useEffect(() => {
    if (usesItems) set("amount", total ? total.toFixed(2) : "");
  }, [total, usesItems]);

  function addLine() {
    if (!picked) return;
    const units = parseFloat(v.quantity);
    if (!units || units <= 0) { setErrors(p => ({ ...p, quantity: "Enter how many units." })); return; }

    if (isSale) {
      const already = cart.filter(l => l.item_name === picked.name).reduce((s, l) => s + l.quantity, 0);
      if (units + already > Number(picked.quantity)) {
        setErrors(p => ({ ...p, quantity: `Only ${picked.quantity} in stock${already ? ` (${already} already added)` : ""}.` }));
        return;
      }
    }

    const price = priceOf(picked);
    setCart(prev => {
      const existing = prev.find(l => l.item_name === picked.name);
      if (existing) {
        return prev.map(l =>
          l.item_name === picked.name
            ? { ...l, quantity: l.quantity + units, amount: +((l.quantity + units) * l.unit_price).toFixed(2) }
            : l
        );
      }
      return [...prev, { item_name: picked.name, quantity: units, unit_price: price, amount: +(units * price).toFixed(2) }];
    });
    set("item_name", "");
    set("quantity", "");
  }

  function removeLine(idx) { setCart(prev => prev.filter((_, i) => i !== idx)); }

  // Inventory tigo update karana logic eka
  async function updateInventoryStock() {
    if (!usesItems || cart.length === 0) return;

    for (const line of cart) {
      const invItem = items.find(i => i.name === line.item_name);
      if (invItem) {
        const currentQty = Number(invItem.quantity) || 0;
        const newQty = isSale
          ? currentQty - line.quantity  // Sale ekedi adu wenawa
          : currentQty + line.quantity; // Purchase ekedi wadi wenawa

        try {
          await inventoryApi.update(invItem.id, {
            ...invItem,
            quantity: Math.max(0, newQty),
          });
        } catch (e) {
          console.error(`Failed to update stock for ${line.item_name}:`, e);
        }
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (usesItems && cart.length === 0) er.amount = "Add at least one item.";
    if (!v.amount || Number(v.amount) <= 0) er.amount = er.amount || "Enter an amount greater than 0.";
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true); setServerError(null);
    const payload = usesItems
      ? {
          transaction_type: type,
          payment_method: v.payment_method,
          amount: Number(v.amount),
          item_name: null,
          quantity: null,
          items: cart.map(l => ({ item_name: l.item_name, quantity: l.quantity })),
        }
      : {
          transaction_type: type,
          payment_method: v.payment_method,
          amount: Number(v.amount),
          item_name: null,
          quantity: null,
          category: cfg.category ? (v.category || null) : null,
          description: cfg.description ? (v.description || null) : null,
        };

    try {
      if (isEdit) {
        await transactionApi.update(txId, payload);
      } else {
        await transactionApi.create(payload);
        await updateInventoryStock();
      }
      router.push("/dashboard/transactions");
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  const itemLabel  = isPurchase ? "Item Purchased" : "Item Sold";
  const unitsLabel = isPurchase ? "Units Bought"   : "Units Sold";
  const listLabel  = isPurchase ? "Items in this purchase" : "Items in this sale";
  const stockHint  = isPurchase ? "Stock is added automatically" : "Stock is deducted automatically";

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Transaction Type" required>
          <select className="select-field" value={type} onChange={e => changeType(e.target.value)}>
            {TRANSACTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Payment Method" required>
          <select className="select-field" value={v.payment_method} onChange={e => set("payment_method", e.target.value)}>
            {PAYMENT_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </div>

      {usesItems ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Left: add items one by one */}
            <div className="space-y-4">
              <FormField label={itemLabel} hint={items.length === 0 ? "No inventory items yet." : stockHint}>
                <select className="select-field" value={v.item_name} onChange={e => set("item_name", e.target.value)}>
                  <option value="">Select an item…</option>
                  {items.map(i => (
                    <option key={i.id} value={i.name}>{i.name} ({i.quantity} in stock)</option>
                  ))}
                </select>
              </FormField>

              <FormField label={unitsLabel} error={errors.quantity}
                hint={picked ? `${picked.quantity} currently in stock` : "Select an item first"}>
                <input className={cls("quantity")} type="number" min="0.01" step="0.01"
                  value={v.quantity} onChange={e => set("quantity", e.target.value)} disabled={!v.item_name} />
              </FormField>

              <Button type="button" variant="secondary" onClick={addLine} disabled={!v.item_name || !v.quantity}>
                + Add item
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800">
              <p className="mb-2 text-sm font-semibold text-slate-700">{listLabel}</p>
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400">No items added yet.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {cart.map((line, idx) => (
                    <li key={idx} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{line.item_name}</p>
                        <p className="text-xs text-slate-500">{line.quantity} × LKR {line.unit_price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800">LKR {line.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => removeLine(idx)}
                          className="text-slate-400 hover:text-red-500" aria-label="Remove item">×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-800">
                <span>Total</span>
                <span>LKR {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <FormField label="Amount (LKR)" error={errors.amount} required hint="Auto-calculated from items — editable">
            <input className={cls("amount")} type="number" min="0.01" step="0.01"
              value={v.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
          </FormField>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label="Amount (LKR)" error={errors.amount} required>
            <input className={cls("amount")} type="number" min="0.01" step="0.01"
              value={v.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
          </FormField>

          {cfg.category && (
            <FormField label="Category" hint="Optional">
              <input className="input-field" value={v.category} onChange={e => set("category", e.target.value)} placeholder="e.g. utilities, rent" />
            </FormField>
          )}

          {cfg.description && (
            <div className="md:col-span-2">
              <FormField label="Description" hint="Optional">
                <input className="input-field" value={v.description} onChange={e => set("description", e.target.value)} />
              </FormField>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/transactions"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update" : "Create")}</Button>
      </div>
    </form>
  );
}