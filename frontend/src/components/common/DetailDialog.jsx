"use client";

const HIDDEN = [
  "id",
  "user_id",
  "item_name",          
  "item_status",       
  "supplier_status",
  "procurement_status",
  "banking_status",
  "notification_type",
  "notification_category",
  // ✅ Supplier-level unit_price is a stale/unused column now that pricing
  // lives per-item inside items_supplied — showing it here is misleading
  // (always LKR 0.00). Raw lat/lng aren't meaningful to a user reading this
  // card either — the "Delivery Location" address already covers that.
  "unit_price",
  "latitude",
  "longitude",
  // items_supplied gets its own dedicated table below instead of falling
  // through to the generic key/value row (which would show [object Object]).
  "items_supplied",
];

const DATE_FIELDS = ["created_at", "updated_at", "read_at"];

const MONEY_FIELDS = [
  "amount", "delivery_cost", "total_cost",
  "estimated_profit", "expected_selling_price", "service_fee", "commission",
];

function label(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v) {
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(v) {
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}

function formatMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

function display(k, v) {
  if (v === null || v === undefined || v === "") return "—";
  if (DATE_FIELDS.includes(k)) return formatDate(v);
  if (MONEY_FIELDS.includes(k)) return formatMoney(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^[a-z_]+$/.test(v)) {
    return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(v);
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

// ✅ Procurement records get their own focused layout — items table,
// quantity, delivery location, cost, dates, recommended suppliers — instead
// of the generic key/value dump (which also can't render items[] or
// recommended_suppliers[] without special-casing them).
function ProcurementDetail({ data }) {
  const items = Array.isArray(data.items) ? data.items : [];
  const recommendedSuppliers = Array.isArray(data.recommended_suppliers) ? data.recommended_suppliers : [];
  const totalQuantity = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const cheapestId = recommendedSuppliers.length > 0
    ? recommendedSuppliers.reduce((min, s) => (Number(s.totalPrice) < Number(min.totalPrice) ? s : min), recommendedSuppliers[0]).id
    : null;

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Items</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{it.item_name}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-slate-500">{it.unit || "—"}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(it.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Row label="Total Quantity" value={totalQuantity} />
        <Row label="Delivery Location" value={data.delivery_location || "—"} />
        <Row label="Total Cost" value={formatMoney(data.total_cost)} />
        <Row label="Order Date" value={data.order_date ? formatDateOnly(data.order_date) : "—"} />
        <Row label="Expected Arrival" value={data.arrival_date ? formatDateOnly(data.arrival_date) : "—"} />
      </div>

      {recommendedSuppliers.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Recommended Suppliers</p>
          <div className="space-y-2">
            {recommendedSuppliers.map((s, i) => (
              <div key={s.id ?? i} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                    {s.name}
                    {i === 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                        Best match
                      </span>
                    )}
                    {s.id === cheapestId && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        💰 Cheapest
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.matchedCount != null ? `${s.matchedCount}/${items.length} items` : ""}
                    {s.distanceKm != null ? ` · ${Number(s.distanceKm).toFixed(1)} km` : ""}
                  </span>
                </div>
                {s.totalPrice != null && (
                  <p className="mt-1 text-xs text-slate-500">{formatMoney(s.totalPrice)}</p>
                )}
                {Array.isArray(s.matchedItems) && s.matchedItems.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Carries: {s.matchedItems.join(", ")}</p>
                )}
                {Array.isArray(s.missing) && s.missing.length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-400">Missing: {s.missing.join(", ")}</p>
                )}
                {s.delivery_location && (
                  <p className="mt-0.5 text-xs text-slate-400">📍 {s.delivery_location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Transaction records get a focused layout — a credit/debit badge, the
// signed amount, items sold (if any), payment method, category and date —
// instead of the generic dump (which shows items[] as [object Object]).
const CREDIT_TYPES = new Set(["sale", "deposit"]);

function TransactionDetail({ data }) {
  const type = String(data.transaction_type || "").toLowerCase();
  const isCredit = CREDIT_TYPES.has(type);
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="space-y-5">
      {/* Hero: amount + credit/debit */}
      <div className={`rounded-2xl p-5 text-center ${
        isCredit ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40"}`}>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
          isCredit ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                   : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"}`}>
          {isCredit ? "Credit (money in)" : "Debit (money out)"}
        </span>
        <p className={`mt-2 font-outfit text-3xl font-extrabold ${
          isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {isCredit ? "+" : "−"} {formatMoney(data.amount)}
        </p>
        <p className="mt-1 text-sm font-medium capitalize text-slate-500 dark:text-slate-400">
          {type.replace(/_/g, " ")}
        </p>
      </div>

      {/* Items (sale/purchase with line items) */}
      {items.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Items</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{it.item_name}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(it.unit_price ?? it.cost_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-2">
        <Row label="Payment Method" value={display("payment_method", data.payment_method)} />
        {data.category && <Row label="Category" value={display("category", data.category)} />}
        {data.service_fee != null && Number(data.service_fee) > 0 && <Row label="Service Fee" value={formatMoney(data.service_fee)} />}
        {data.commission != null && Number(data.commission) > 0 && <Row label="Commission" value={formatMoney(data.commission)} />}
        {data.description && <Row label="Note" value={data.description} />}
        <Row label="Date" value={data.created_at ? formatDate(data.created_at) : "—"} />
      </div>
    </div>
  );
}

// ✅ Inventory items get a focused layout — stock level with a low-stock flag,
// weighted-average cost with the batch price range, reorder level, supplier and
// total stock value — instead of the generic dump.
function InventoryDetail({ data }) {
  const qty = Number(data.quantity) || 0;
  const reorder = Number(data.reorder_level) || 0;
  const low = qty <= reorder;
  const batchCount = Number(data.batch_count) || 1;
  const hasRange = batchCount > 1 && Number(data.cost_min) !== Number(data.cost_max);
  const totalValue = qty * (Number(data.cost_price) || 0);

  return (
    <div className="space-y-5">
      {/* Hero: item + stock status */}
      <div className={`rounded-2xl p-5 text-center ${
        low ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}`}>
        <p className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-100">{data.name}</p>
        <p className={`mt-1 font-outfit text-3xl font-extrabold ${
          low ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {qty} <span className="text-base font-semibold text-slate-500">{data.unit || "units"}</span>
        </p>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
          low ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
          {low ? "⚠ Running low — reorder needed" : "✓ In stock"}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {data.category && <Row label="Category" value={display("category", data.category)} />}
        <Row label="Supplier" value={data.supplier_name || "—"} />
        <Row label="Reorder Level" value={`${reorder} ${data.unit || "units"}`} />
        <Row label="Avg. Unit Cost" value={formatMoney(data.cost_price)} />
        {hasRange && (
          <Row label="Cost Range" value={`${formatMoney(data.cost_min)} – ${formatMoney(data.cost_max)} · ${batchCount} batches`} />
        )}
        <Row label="Total Stock Value" value={formatMoney(totalValue)} />
        {data.lead_time_days != null && <Row label="Lead Time" value={`${data.lead_time_days} day(s)`} />}
        {data.received_at && <Row label="Last Received" value={formatDate(data.received_at)} />}
      </div>
    </div>
  );
}

export default function DetailDialog({ open, title, data, onClose }) {
  if (!open || !data) return null;

  // A transaction has transaction_type + payment_method (sale/purchase/expense…).
  // An inventory item has `name` + quantity + reorder_level (no transaction_type).
  // A procurement record has items[] + order_date/total_cost but no payment_method.
  const isTransaction = !!data.transaction_type && data.payment_method !== undefined;
  const isInventory = !isTransaction && data.name !== undefined
    && data.quantity !== undefined && data.reorder_level !== undefined
    && !Array.isArray(data.items);
  const isProcurement = !isTransaction && !isInventory && Array.isArray(data.items);

  const entries = (isProcurement || isTransaction || isInventory) ? [] : Object.entries(data).filter(
    ([k, v]) => !HIDDEN.includes(k) && v !== null && v !== undefined && v !== ""
  );

  // ✅ items_supplied ([{item_name, quantity, unit, unit_price}]) needs its
  // own table instead of the generic key/value row.
  const suppliedItems = Array.isArray(data.items_supplied) ? data.items_supplied : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="card-elevated max-h-[85vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 text-base">✕</button>
        </div>

        {isTransaction ? (
          <TransactionDetail data={data} />
        ) : isInventory ? (
          <InventoryDetail data={data} />
        ) : isProcurement ? (
          <ProcurementDetail data={data} />
        ) : (
          <>
            <div className="space-y-2">
              {entries.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800"
                >
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {label(k)}
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {display(k, v)}
                  </span>
                </div>
              ))}
            </div>

            {suppliedItems.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Items Supplied
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold">Unit</th>
                        <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliedItems.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{it.item_name}</td>
                          <td className="px-3 py-2 text-right">{it.quantity}</td>
                          <td className="px-3 py-2 text-slate-500">{it.unit || "—"}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(it.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}