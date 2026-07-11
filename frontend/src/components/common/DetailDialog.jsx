"use client";

export default function DetailDialog({ open, title, data, onClose }) {
  if (!open) return null;

  const hidden = ["user_id"];
  const entries = Object.entries(data || {}).filter(([k]) => !hidden.includes(k));

  function label(k) {
    return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function display(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold font-outfit" style={{ color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 text-base">✕</button>
        </div>
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 rounded-xl px-4 py-2.5" style={{ background: "var(--bg-soft)" }}>
              <span className="text-sm font-medium text-soft">{label(k)}</span>
              <span className="text-sm font-semibold text-right" style={{ color: "var(--text)" }}>{display(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}