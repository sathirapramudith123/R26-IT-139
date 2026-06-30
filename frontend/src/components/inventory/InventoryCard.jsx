"use client";
import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters/index";
import { transactionApi } from "@/services/api/transaction";
import { inventoryApi } from "@/services/api/inventory";

export default function InventoryCard({ item, onSold }) {
  const [selling,  setSelling]  = useState(false);
  const [qty,      setQty]      = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const isLow = item.status === "low_stock";
  const isOut = item.quantity <= 0;

  async function handleQuickSell(e) {
    e.preventDefault();
    if (!qty || qty <= 0) { setError("Enter a valid quantity."); return; }
    if (qty > item.quantity) { setError(`Only ${item.quantity} in stock.`); return; }

    setSelling(true); setError(""); setSuccess("");
    try {
      // Create a sale transaction — TransactionService auto-deducts inventory
      await transactionApi.create({
        transaction_type: "sale",
        description:      `Quick sale — ${item.name}`,
        amount:           parseFloat(item.selling_price || item.unit_price || 0) * qty,
        payment_method:   "cash",
        item_name:        item.name,
        quantity:         qty,
      });
      setSuccess(`✓ Sold ${qty} ${item.unit || "units"} — stock updated`);
      setShowForm(false);
      setQty(1);
      if (onSold) onSold();                // refresh parent list
    } catch (err) {
      setError(err.message || "Sale failed.");
    } finally {
      setSelling(false);
    }
  }


  // JSX for the card
  return (
    <div className={`card flex flex-col gap-3 ${isLow ? "border-amber-200" : ""} ${isOut ? "border-red-200 opacity-75" : ""}`}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-outfit font-semibold text-slate-900 truncate">{item.name}</h3>
          <p className="text-xs text-slate-400">{item.category || "—"} · {item.supplier_name || "—"}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Stock level */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span className="text-xs font-medium text-slate-500">In stock</span>
        <span className={`text-lg font-bold ${isLow ? "text-amber-600" : isOut ? "text-red-600" : "text-slate-900"}`}>
          {item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit || "units"}</span>
        </span>
      </div>

      {/* Price and reorder */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>Cost: <span className="font-medium text-slate-700">{formatCurrency(item.unit_price)}</span></div>
        <div>Reorder at: <span className="font-medium text-slate-700">{item.reorder_level}</span></div>
      </div>

      {success && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-700">
          {success}
        </div>
      )}

      {/* Quick sell form */}
      {showForm && !isOut && (
        <form onSubmit={handleQuickSell} className="rounded-xl bg-teal-50 border border-teal-100 p-3 space-y-2">
          <p className="text-xs font-semibold text-teal-800">Quick Sell</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max={item.quantity} value={qty}
              onChange={e => setQty(Number(e.target.value))}
              className="input-field text-center w-20 text-sm py-1"
            />
            <span className="text-xs text-slate-500">{item.unit || "units"}</span>
            <Button type="submit" size="sm" disabled={selling} className="ml-auto">
              {selling ? "Saving…" : "Confirm"}
            </Button>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }}
              className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-slate-100 pt-3">
        {!isOut ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => { setShowForm(s => !s); setSuccess(""); setError(""); }}
            className="flex-1"
          >
            ⚡ Quick Sell
          </Button>
        ) : (
          <span className="flex-1 text-center text-xs text-red-500 font-medium py-1">Out of stock</span>
        )}
        <Link href={`/dashboard/inventory/${item.id}`}>
          <Button size="sm" variant="ghost">View</Button>
        </Link>
        <Link href={`/dashboard/inventory/${item.id}/edit`}>
          <Button size="sm" variant="ghost">Edit</Button>
        </Link>
      </div>
    </div>
  );
}
