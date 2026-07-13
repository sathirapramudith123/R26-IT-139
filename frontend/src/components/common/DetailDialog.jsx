"use client";

// never show these to the user
const HIDDEN = [
  "id",
  "user_id",
  "item_name",          // duplicated as `name`
  "item_status",        // duplicated as `status`
  "supplier_status",
  "procurement_status",
  "banking_status",
  "notification_type",
  "notification_category",
];

const DATE_FIELDS = ["created_at", "updated_at", "read_at"];

const MONEY_FIELDS = [
  "amount", "unit_price", "delivery_cost", "total_cost",
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
  // "cash_deposit" → "Cash Deposit"
  if (typeof v === "string" && /^[a-z_]+$/.test(v)) {
    return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(v);
}

export default function DetailDialog({ open, title, data, onClose }) {
  if (!open || !data) return null;

  const entries = Object.entries(data).filter(
    ([k, v]) => !HIDDEN.includes(k) && v !== null && v !== undefined && v !== ""
  );

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
      </div>
    </div>
  );
}