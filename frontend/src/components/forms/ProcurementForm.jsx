"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement";
import { supplierApi } from "@/services/api/supplier";
import { inventoryApi } from "@/services/api/inventory";
import { PROCUREMENT_STATUSES } from "@/lib/constants";

const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);

  // AI Recommendation State (Component 2 Integration)
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [v, setV] = useState({
    item_name:               initialData.item_name               ?? "",
    quantity:                initialData.quantity                ?? "",
    delivery_location:       initialData.delivery_location       ?? "",
    expected_selling_price: initialData.expected_selling_price ?? "",
    selected_supplier_name: initialData.selected_supplier_name ?? "",
    total_cost:              initialData.total_cost              ?? "",
    estimated_profit:        initialData.estimated_profit        ?? "",
    status:                  initialData.status                  ?? "pending",
  });

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  // Load inventory items + suppliers
  useEffect(() => {
    supplierApi.list()
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => setSuppliers([]));
    inventoryApi.list()
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  // 💡 Auto-fill Selling Price when Item is selected
  useEffect(() => {
    if (v.item_name) {
      const selectedItem = items.find(i => i.name === v.item_name);
      if (selectedItem && !v.expected_selling_price) {
        const price = selectedItem.selling_price || selectedItem.unit_price || 0;
        if (price) set("expected_selling_price", price);
      }
    }
  }, [v.item_name, items]);

  // 💡 AUTO-CALCULATION LOGIC FOR COSTS & PROFITS
  useEffect(() => {
    const qty = Number(v.quantity) || 0;
    const selectedSupplier = suppliers.find(s => s.name === v.selected_supplier_name);
    const selectedItem = items.find(i => i.name === v.item_name);

    if (qty > 0) {
      const unitPrice = selectedSupplier?.unit_price || selectedItem?.cost_price || 0;
      const deliveryCost = Number(selectedSupplier?.delivery_cost) || 0;
      
      // Total Cost = (Unit Price * Quantity) + Delivery Fee
      const computedTotalCost = (unitPrice * qty) + deliveryCost;
      
      // Selling Price Calculation
      const sellingPrice = Number(v.expected_selling_price) || selectedItem?.selling_price || 0;
      const computedProfit = sellingPrice > 0 ? (sellingPrice * qty) - computedTotalCost : 0;

      setV(prev => ({
        ...prev,
        total_cost: computedTotalCost > 0 ? computedTotalCost.toFixed(2) : prev.total_cost,
        estimated_profit: sellingPrice > 0 ? computedProfit.toFixed(2) : prev.estimated_profit
      }));
    }
  }, [v.item_name, v.quantity, v.selected_supplier_name, v.expected_selling_price, suppliers, items]);

  // 🤖 FETCH AI BUY ADVICE FROM COMPONENT 2 BACKEND (Optional AI Feature)
  useEffect(() => {
    if (v.item_name && v.quantity > 0) {
      setLoadingAi(true);
      // Backend AI Service call (Replace URL with your API Endpoint)
      fetch("/api/procurement/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: v.item_name,
          quantity: v.quantity,
          supplier: v.selected_supplier_name
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.recommendation) setAiAdvice(data);
      })
      .catch(() => setAiAdvice(null))
      .finally(() => setLoadingAi(false));
    }
  }, [v.item_name, v.quantity, v.selected_supplier_name]);

  function withCurrent(list, current) {
    const names = list.filter(Boolean);
    if (current && !names.includes(current)) return [current, ...names];
    return names;
  }
  const supplierOptions = withCurrent(suppliers.map((s) => s.name), v.selected_supplier_name);
  const itemOptions     = withCurrent(items.map((i) => i.name), v.item_name);
  const districtOptions = withCurrent(DISTRICTS, v.delivery_location);

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.item_name.trim()) er.item_name = "Item name is required.";
    if (!v.quantity || Number(v.quantity) <= 0) er.quantity = "Enter a quantity greater than 0.";
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true); setServerError(null);
    const num = x => x === "" ? 0 : Number(x);
    const payload = {
      ...v,
      quantity: Number(v.quantity),
      expected_selling_price: num(v.expected_selling_price),
      total_cost: num(v.total_cost),
      estimated_profit: num(v.estimated_profit),
    };
    try {
      if (isEdit) await procurementApi.update(procurementId, payload);
      else await procurementApi.create(payload);
      router.push("/dashboard/procurement");
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const cls    = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;
  const selCls = k => `select-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* 🤖 AI Procurement Insight Card */}
      {aiAdvice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🤖</span>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">AI Buy Advice Insight</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              aiAdvice.recommendation.includes("BUY") ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"
            }`}>
              {aiAdvice.recommendation}
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            AI Confidence: <b>{aiAdvice.ai_confidence_pct}%</b> | Predicted 4-Wk Price: <b>LKR {aiAdvice.predicted_future_price_rs}</b>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField
          label="Item Name"
          error={errors.item_name}
          hint={itemOptions.length === 0 ? "No inventory items yet — type a name." : "Choose from your inventory"}
          required
        >
          {itemOptions.length > 0 ? (
            <select
              className={selCls("item_name")}
              value={v.item_name}
              onChange={(e) => set("item_name", e.target.value)}
            >
              <option value="">Select an item</option>
              {itemOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              className={cls("item_name")}
              value={v.item_name}
              onChange={(e) => set("item_name", e.target.value)}
              placeholder="e.g. Rice 5kg"
            />
          )}
        </FormField>

        <FormField label="Quantity" error={errors.quantity} required>
          <input
            className={cls("quantity")}
            type="number" min="0.01" step="0.01"
            value={v.quantity}
            onChange={e => set("quantity", e.target.value)}
          />
        </FormField>

        <FormField label="Delivery Location" hint="Select the district">
          <select
            className="select-field"
            value={v.delivery_location}
            onChange={(e) => set("delivery_location", e.target.value)}
          >
            <option value="">Select a district</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Expected Unit Selling Price (LKR)" hint="Auto-filled from inventory">
          <input
            className="input-field"
            type="number" min="0" step="0.01"
            value={v.expected_selling_price}
            onChange={e => set("expected_selling_price", e.target.value)}
          />
        </FormField>

        <FormField
          label="Selected Supplier"
          hint={supplierOptions.length === 0 ? "No suppliers yet — add one first, or type a name." : "Choose from your suppliers"}
        >
          {supplierOptions.length > 0 ? (
            <select
              className="select-field"
              value={v.selected_supplier_name}
              onChange={(e) => set("selected_supplier_name", e.target.value)}
            >
              <option value="">Select a supplier</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              value={v.selected_supplier_name}
              onChange={(e) => set("selected_supplier_name", e.target.value)}
              placeholder="e.g. ABC Traders"
            />
          )}
        </FormField>

        <FormField label="Total Cost (LKR)" hint="Auto-calculated (Cost + Delivery)">
          <input
            className="input-field bg-slate-50 dark:bg-slate-900"
            type="number" min="0" step="0.01"
            value={v.total_cost}
            onChange={e => set("total_cost", e.target.value)}
          />
        </FormField>

        <FormField label="Estimated Profit (LKR)" hint="Auto-calculated (Revenue - Cost)">
          <input
            className="input-field bg-slate-50 dark:bg-slate-900"
            type="number" step="0.01"
            value={v.estimated_profit}
            onChange={e => set("estimated_profit", e.target.value)}
          />
        </FormField>

        <FormField label="Status">
          <select
            className="select-field"
            value={v.status}
            onChange={e => set("status", e.target.value)}
          >
            {PROCUREMENT_STATUSES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/procurement">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update Decision" : "Save Decision")}
        </Button>
      </div>
    </form>
  );
}