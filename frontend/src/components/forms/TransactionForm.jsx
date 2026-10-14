"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { transactionApi } from "@/services/api/transaction";
import { inventoryApi } from "@/services/api/inventory";
import { supplierApi } from "@/services/api/supplier";
import { TRANSACTION_TYPES, PAYMENT_METHODS } from "@/lib/constants";

import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/formatters";
import {
  priceKey,
  saleSuggestion,
  purchaseSellingPrice,
  priceOptions,
  splitByBatch,
  afterCart,
} from "@/lib/priceHints";
// 1. Config for Transaction Modes
const TYPE_CONFIG = {
  sale: { mode: "items" },
  purchase: { mode: "items" },
  expense: { mode: "simple", category: true, description: true },
  deposit: { mode: "simple", category: true, description: true },
  transfer: { mode: "simple", category: true, description: true },
};

// 2. Standardized Categories for AI & Analytics Models
const CATEGORIES_BY_TYPE = {
  expense: [
    "Utilities (Electricity/Water)",
    "Rent",
    "Transport / Fuel",
    "Labor / Wages",
    "Loss / Wastage / Damage",
  ],
  deposit: ["Agency Banking Cash-In", "Owner Capital Injection", "Other Income"],
  transfer: ["Agency Wallet Top-up", "Supplier Payment", "Inter-Bank Transfer"],
};

export default function TransactionForm({ initialData = {}, txId = null }) {
  const router = useRouter();
  const isEdit = !!txId;
  const [saving, setSaving] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [items, setItems] = useState([]);
  const [priceHints, setPriceHints] = useState({}); // per item: last sale + FIFO batches (lib/priceHints.js)
  const [balances, setBalances] = useState(null); // what each supplier is owed (Supplier Payment)

  const [v, setV] = useState({
    transaction_type: initialData.transaction_type ?? "sale",
    payment_method: initialData.payment_method ?? "cash",
    amount: initialData.amount ?? "",
    item_name: "", // picker only
    quantity: "", // picker only
    unit_price: "", // picker only  >>> NEW: typed at add time
    selling_price: "", // picker only — purchase: selling price / MRP of the new batch
    category: initialData.category ?? "",
    supplier_name: initialData.supplier_name ?? "", // Supplier Payment only
    description: initialData.description ?? "",
  });

  const [cart, setCart] = useState(
    (initialData.items ?? []).map((l) => ({
      item_name: l.item_name,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price) || 0,
      cost_price: Number(l.cost_price) || 0, // COGS snapshot
      selling_price: Number(l.selling_price) || 0, // purchase: MRP of the batch
      amount: Number(l.amount) || 0,
    })),
  );

  function set(k, val) {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  }

  const type = v.transaction_type;
  const cfg = TYPE_CONFIG[type] ?? { mode: "simple", category: true, description: true };
  const usesItems = cfg.mode === "items";
  const isSale = type === "sale";
  const isPurchase = type === "purchase";
  const picked = items.find((i) => i.name === v.item_name);
  const total = cart.reduce((s, l) => s + (l.amount || 0), 0);

  // >>> Price field labels/hints depend on the mode
  const priceLabel = isPurchase ? t("Cost Price per Unit (LKR)") : t("Selling Price per Unit (LKR)");
  // the item's price hint, less the units newly added to the cart (they use the oldest batches
  // first). When editing, the saved lines were already taken out of stock, so they do not count.
  const hintFor = (name) => {
    // per price: units in the cart minus the units of the saved transaction (when editing)
    const byPrice = {};
    for (const l of cart.filter((x) => x.item_name === name))
      byPrice[l.unit_price] = (byPrice[l.unit_price] || 0) + l.quantity;
    if (isEdit)
      for (const l of (initialData.items ?? []).filter((x) => x.item_name === name))
        byPrice[Number(l.unit_price)] = (byPrice[Number(l.unit_price)] || 0) - Number(l.quantity || 0);
    const lines = Object.entries(byPrice)
      .filter(([, q]) => q > 0)
      .map(([p, q]) => ({ unit_price: Number(p), quantity: q }));
    return afterCart(priceHints[priceKey(name)], lines);
  };
  const saleHint = isSale && v.item_name ? hintFor(v.item_name) : null;
  const suggestion = isSale ? saleSuggestion(saleHint) : null;
  const options = isSale ? priceOptions(saleHint) : [];
  const priceHint = isPurchase
    ? t("Auto-filled from inventory cost — editable")
    : suggestion?.note || t("Enter your selling price per unit");

  // Supplier Payment: pick the supplier and see what is owed (received orders − payments)
  const isSupplierPayment = type === "transfer" && v.category === "Supplier Payment";
  useEffect(() => {
    if (!isSupplierPayment || balances) return;
    supplierApi
      .balances()
      .then((d) =>
        setBalances(d && Array.isArray(d.suppliers) ? d : { payments_tracked: false, suppliers: [] }),
      )
      .catch(() => setBalances({ payments_tracked: false, suppliers: [] }));
  }, [isSupplierPayment, balances]);
  const owed = balances?.suppliers.find((s) => s.supplier_name === v.supplier_name);
  // when editing a payment, this payment is already counted in "paid"
  const owedNow =
    owed && isEdit && initialData.supplier_name === owed.supplier_name
      ? {
          ...owed,
          paid: owed.paid - Number(initialData.amount || 0),
          outstanding: owed.outstanding + Number(initialData.amount || 0),
        }
      : owed;

  // Transfer can't be Cash; Deposit can ONLY be Cash.
  const paymentMethodOptions =
    type === "transfer"
      ? PAYMENT_METHODS.filter((o) => o.value !== "cash")
      : type === "deposit"
        ? PAYMENT_METHODS.filter((o) => o.value === "cash")
        : PAYMENT_METHODS;

  // >>> Only the COST comes from inventory now (selling price is typed for sales)
  function costOf(item) {
    return parseFloat(item?.cost_price ?? item?.unit_price ?? item?.price) || 0;
  }

  // Picking an item: purchase pre-fills the cost (and the newest selling price as the batch MRP);
  // sale pre-fills the oldest batch's selling price, else the last price it was sold at. All editable.
  function pickItem(name) {
    set("item_name", name);
    const inv = items.find((i) => i.name === name);
    const hint = hintFor(name);
    const suggested = isSale ? saleSuggestion(hint).price : null;
    set("unit_price", isPurchase && inv ? String(costOf(inv)) : suggested ? String(suggested) : "");
    const mrp = isPurchase ? purchaseSellingPrice(hint) : null;
    set("selling_price", mrp ? String(mrp) : "");
  }

  function changeType(val) {
    set("transaction_type", val);
    set("item_name", "");
    set("quantity", "");
    set("unit_price", "");
    set("selling_price", "");
    set("amount", "");
    set("category", "");
    setCart([]);

    if (val === "deposit") {
      set("payment_method", "cash");
    } else if (val === "transfer" && v.payment_method === "cash") {
      const firstNonCash = PAYMENT_METHODS.find((o) => o.value !== "cash");
      set("payment_method", firstNonCash ? firstNonCash.value : "");
    }
  }

  // Fetch inventory items
  useEffect(() => {
    setLoadingInventory(true);
    inventoryApi
      .list()
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoadingInventory(false));
    transactionApi
      .priceHints()
      .then((d) => setPriceHints(d && typeof d === "object" ? d : {}))
      .catch(() => setPriceHints({})); // no suggestion is fine — the price is typed as before
  }, []);

  // Edit mode: backfill only PURCHASE line costs from inventory when missing.
  // (Sale lines already carry the typed selling price, so we never overwrite them.)
  useEffect(() => {
    if (!isEdit || !items.length || !isPurchase) return;
    setCart((prev) =>
      prev.map((l) => {
        if (l.unit_price > 0) return l;
        const inv = items.find((i) => i.name === l.item_name);
        const price = inv ? costOf(inv) : 0;
        return { ...l, unit_price: price, amount: +(l.quantity * price).toFixed(2) };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isEdit, isPurchase]);

  // Sync total to amount field
  useEffect(() => {
    if (usesItems) set("amount", total ? total.toFixed(2) : "");
  }, [total, usesItems]);

  // safety net for payment method on mount (edit mode / initialData)
  useEffect(() => {
    if (type === "deposit" && v.payment_method !== "cash") {
      set("payment_method", "cash");
    } else if (type === "transfer" && v.payment_method === "cash") {
      const firstNonCash = PAYMENT_METHODS.find((o) => o.value !== "cash");
      set("payment_method", firstNonCash ? firstNonCash.value : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLine() {
    if (!picked) return;

    const units = parseFloat(v.quantity);
    if (!units || units <= 0) {
      setErrors((p) => ({ ...p, quantity: t("Enter how many units.") }));
      return;
    }

    // >>> price must be typed (sale) / present (purchase)
    const price = parseFloat(v.unit_price);
    if (!price || price <= 0) {
      setErrors((p) => ({
        ...p,
        unit_price: isPurchase ? t("Enter the cost price per unit.") : t("Enter the selling price per unit."),
      }));
      return;
    }

    if (isSale) {
      const already = cart.filter((l) => l.item_name === picked.name).reduce((s, l) => s + l.quantity, 0);
      if (units + already > Number(picked.quantity)) {
        setErrors((p) => ({
          ...p,
          quantity: `Only ${picked.quantity} in stock${already ? ` (${already} already added)` : ""}.`,
        }));
        return;
      }
    }

    // a sale at the oldest batch's price is split over the batches (FIFO): 8 units with 5 left at
    // 240 -> 5 × 240 + 3 × 260. Lines with the same item and price are merged.
    const parts = isSale
      ? splitByBatch(hintFor(picked.name), units, price)
      : [{ quantity: units, unit_price: price }];
    setCart((prev) => {
      let next = [...prev];
      for (const part of parts) {
        const idx = next.findIndex((l) => l.item_name === picked.name && l.unit_price === part.unit_price);
        if (idx >= 0) {
          const q = next[idx].quantity + part.quantity;
          next[idx] = { ...next[idx], quantity: q, amount: +(q * next[idx].unit_price).toFixed(2) };
        } else {
          next.push({
            item_name: picked.name,
            quantity: part.quantity,
            unit_price: part.unit_price, // sale: selling price | purchase: cost price
            cost_price: costOf(picked), // snapshot of unit cost for accurate COGS
            ...(isPurchase &&
              parseFloat(v.selling_price) > 0 && { selling_price: parseFloat(v.selling_price) }),
            amount: +(part.quantity * part.unit_price).toFixed(2),
          });
        }
      }
      return next;
    });

    set("item_name", "");
    set("quantity", "");
    set("unit_price", "");
    set("selling_price", "");
  }

  function removeLine(idx) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (usesItems && cart.length === 0) er.amount = t("Add at least one item.");
    if (!v.amount || Number(v.amount) <= 0) er.amount = er.amount || t("Enter an amount greater than 0.");
    if (cfg.category && !v.category) er.category = t("Please select a category.");
    if (isSupplierPayment && !v.supplier_name) er.supplier_name = t("Select the supplier you are paying.");

    if (type === "transfer" && v.payment_method === "cash") {
      er.payment_method = t("Cash isn't allowed for Transfer transactions.");
    } else if (type === "deposit" && v.payment_method !== "cash") {
      er.payment_method = t("Deposit must be paid via Cash.");
    }

    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }

    setSaving(true);
    setServerError(null);

    // Enhanced Payload with Unit Prices for Historical Analytics Data Integrity
    const payload = usesItems
      ? {
          transaction_type: type,
          payment_method: v.payment_method,
          amount: Number(v.amount),
          item_name: null,
          quantity: null,
          category: null,
          description: v.description || null,
          items: cart.map((l) => ({
            item_name: l.item_name,
            quantity: l.quantity,
            unit_price: l.unit_price, // sale -> selling price | purchase -> cost price
            cost_price: l.cost_price ?? 0, // cost snapshot for accurate COGS
            ...(isPurchase && l.selling_price > 0 && { selling_price: l.selling_price }), // batch MRP
            amount: l.amount,
          })),
        }
      : {
          transaction_type: type,
          payment_method: v.payment_method,
          amount: Number(v.amount),
          item_name: null,
          quantity: null,
          category: cfg.category ? v.category || null : null,
          description: cfg.description ? v.description || null : null,
          ...(isSupplierPayment && { supplier_name: v.supplier_name }),
        };

    try {
      if (isEdit) {
        await transactionApi.update(txId, payload);
      } else {
        await transactionApi.create(payload);
      }
      router.push("/dashboard/transactions");
    } catch (err) {
      setServerError(err.message || t("Save failed."));
    } finally {
      setSaving(false);
    }
  }

  const cls = (k) => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  const itemLabel = isPurchase ? t("Item Purchased") : t("Item Sold");
  const unitsLabel = isPurchase ? t("Units Bought") : t("Units Sold");
  const listLabel = isPurchase ? t("Items in this purchase") : t("Items in this sale");
  const stockHint = isPurchase ? t("Stock is added automatically") : t("Stock is deducted automatically");

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl mx-auto space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label={t("Transaction Type")} required>
          <select className="select-field" value={type} onChange={(e) => changeType(e.target.value)}>
            {TRANSACTION_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("Payment Method")}
          required
          error={errors.payment_method}
          hint={
            type === "transfer"
              ? t("Cash isn't available for transfers")
              : type === "deposit"
                ? t("Deposits are always Cash")
                : undefined
          }
        >
          <select
            className="select-field"
            value={v.payment_method}
            onChange={(e) => set("payment_method", e.target.value)}
            disabled={type === "deposit"}
          >
            {paymentMethodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {usesItems ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Left: Add Items */}
            <div className="space-y-4">
              <FormField
                label={itemLabel}
                hint={
                  loadingInventory
                    ? t("Loading items...")
                    : items.length === 0
                      ? t("No inventory items yet.")
                      : stockHint
                }
              >
                <select
                  className="select-field"
                  value={v.item_name}
                  onChange={(e) => pickItem(e.target.value)}
                  disabled={loadingInventory}
                >
                  <option value="">
                    {loadingInventory ? t("Loading inventory...") : t("Select an item…")}
                  </option>
                  {items.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name} ({i.quantity} {t("in stock)")}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={unitsLabel}
                error={errors.quantity}
                hint={picked ? `${picked.quantity} ${t("currently in stock")}` : t("Select an item first")}
              >
                <input
                  className={cls("quantity")}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={v.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  disabled={!v.item_name}
                />
              </FormField>

              {/* >>> NEW: price per unit — typed for sales, auto-filled for purchases */}
              <FormField label={priceLabel} error={errors.unit_price} hint={priceHint}>
                <input
                  className={cls("unit_price")}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={v.unit_price}
                  onChange={(e) => set("unit_price", e.target.value)}
                  disabled={!v.item_name}
                  placeholder="0.00"
                />
              </FormField>
              {options.length > 0 && (
                <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label={t("Choose a price")}>
                  {options.map((o) => {
                    const on = Number(v.unit_price) === o.price;
                    return (
                      <button
                        key={o.price}
                        type="button"
                        onClick={() => set("unit_price", String(o.price))}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          on
                            ? "border-primary bg-primary text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {o.last
                          ? `${t("Last sold")} ${formatCurrency(o.price)}`
                          : `${formatCurrency(o.price)} · ${o.left} ${t("left")}`}
                      </button>
                    );
                  })}
                </div>
              )}
              {suggestion?.warning && (
                <p className="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  ⚠ {suggestion.warning}
                </p>
              )}

              {/* purchase: the selling price / MRP of this batch — sales suggest it while this stock lasts */}
              {isPurchase && (
                <FormField
                  label={t("Selling price / MRP per unit (LKR)")}
                  hint={t("Optional — suggested on sales while this stock lasts")}
                >
                  <input
                    className={cls("selling_price")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={v.selling_price}
                    onChange={(e) => set("selling_price", e.target.value)}
                    disabled={!v.item_name}
                    placeholder="0.00"
                  />
                </FormField>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={addLine}
                disabled={!v.item_name || !v.quantity || !v.unit_price}
              >
                {t("+ Add item")}
              </Button>
            </div>

            {/* Right: Cart Overview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800">
              <p className="mb-2 text-sm font-semibold text-slate-700">{listLabel}</p>
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400">{t("No items added yet.")}</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {cart.map((line, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{line.item_name}</p>
                        <p className="text-xs text-slate-500">
                          {line.quantity} × {formatCurrency(line.unit_price || 0)}
                          {isPurchase &&
                            line.selling_price > 0 &&
                            ` · ${t("MRP")} ${formatCurrency(line.selling_price)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="whitespace-nowrap font-semibold text-slate-800">
                          {formatCurrency(line.amount || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-slate-400 hover:text-red-500"
                          aria-label={t("Remove item")}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-800">
                <span>{t("Total")}</span>
                <span className="whitespace-nowrap">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <FormField
            label={t("Amount (LKR)")}
            error={errors.amount}
            required
            hint={t("Auto-calculated from items — editable")}
          >
            <input
              className={cls("amount")}
              type="number"
              min="0.01"
              step="0.01"
              value={v.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          <FormField label={t("Description / Note")} hint={t("Optional")}>
            <input
              className="input-field"
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Add optional note for sale/purchase...")}
            />
          </FormField>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label={t("Amount (LKR)")} error={errors.amount} required>
            <input
              className={cls("amount")}
              type="number"
              min="0.01"
              step="0.01"
              value={v.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          {cfg.category && (
            <FormField
              label={t("Category")}
              error={errors.category}
              required
              hint={t("Required for AI Analytics")}
            >
              <select
                className="select-field"
                value={v.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">{t("Select Category...")}</option>
                {(CATEGORIES_BY_TYPE[type] || []).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {isSupplierPayment && (
            <>
              <FormField label={t("Supplier")} error={errors.supplier_name} required>
                <select
                  className={`select-field ${errors.supplier_name ? "border-red-400" : ""}`}
                  value={v.supplier_name}
                  onChange={(e) => set("supplier_name", e.target.value)}
                >
                  <option value="">{balances ? t("Select supplier...") : t("Loading...")}</option>
                  {(balances?.suppliers || []).map((s) => (
                    <option key={s.supplier_name} value={s.supplier_name}>
                      {s.supplier_name}
                      {s.outstanding > 0 ? ` — ${t("owed")} ${formatCurrency(s.outstanding)}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800">
                {!owedNow ? (
                  <p className="text-xs text-slate-500">
                    {t("Select a supplier to see how much you owe them.")}
                  </p>
                ) : (
                  <>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">{t("Received orders")}</span>
                      <span className="font-medium">{formatCurrency(owedNow.received)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">{t("Already paid")}</span>
                      <span className="font-medium">− {formatCurrency(owedNow.paid)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 font-semibold">
                      <span>{owedNow.outstanding >= 0 ? t("To pay") : t("Paid in advance")}</span>
                      <span className={owedNow.outstanding > 0 ? "text-red-600" : "text-emerald-600"}>
                        {formatCurrency(Math.abs(owedNow.outstanding))}
                      </span>
                    </div>
                    {owedNow.on_order > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {t("On order, not received yet")}: {formatCurrency(owedNow.on_order)}
                      </p>
                    )}
                    {owedNow.outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => set("amount", String(owedNow.outstanding))}
                        className="mt-2 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
                      >
                        {t("Pay full amount")} ({formatCurrency(owedNow.outstanding)})
                      </button>
                    )}
                    {Number(v.amount) > owedNow.outstanding && owedNow.outstanding >= 0 && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        ⚠ {t("This is more than you owe this supplier.")}
                      </p>
                    )}
                    {!balances.payments_tracked && (
                      <p className="mt-2 text-xs text-amber-700">
                        {t(
                          "Earlier payments are not linked to suppliers yet, so 'Already paid' may be incomplete.",
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {cfg.description && (
            <div className="md:col-span-2">
              <FormField label={t("Description")} hint={t("Optional")}>
                <input
                  className="input-field"
                  value={v.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={t("Add optional note...")}
                />
              </FormField>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/transactions">
          <Button variant="secondary" type="button">
            {t("Cancel")}
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? t("Saving...") : isEdit ? t("Update") : t("Create")}
        </Button>
      </div>
    </form>
  );
}
