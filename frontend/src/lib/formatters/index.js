export function formatCurrency(value = 0, decimals = false) {
  const n = Number(value) || 0;
  return "LKR " + n.toLocaleString("en-LK", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

export function compactCurrency(value = 0) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `LKR ${(n / 1_000).toFixed(1)}K`;
  return `LKR ${n.toLocaleString("en-LK")}`;
}

export function formatDate(value, locale = "en-LK") {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(locale); }
  catch { return "—"; }
}

export function formatDateTime(value, locale = "en-LK") {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(locale); }
  catch { return "—"; }
}

export function timeAgo(value) {
  if (!value) return "—";
  try {
    const diff = (new Date(value) - Date.now()) / 1000;
    const abs  = Math.abs(diff);
    const rtf  = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (abs < 60)      return rtf.format(Math.round(diff), "second");
    if (abs < 3600)    return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400)   return rtf.format(Math.round(diff / 3600), "hour");
    if (abs < 2592000) return rtf.format(Math.round(diff / 86400), "day");
    return formatDate(value);
  } catch { return formatDate(value); }
}

export function isoToDateInput(isoStr) {
  if (!isoStr) return "";
  return String(isoStr).slice(0, 10);
}

export function localDateToISO(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString();
}

export function titleCase(str = "") {
  return String(str).split(/[-_\s]+/).filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export function truncate(str = "", maxLen = 40) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function capitalize(str = "") {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const STATUS_COLORS = {
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50   text-blue-700   border-blue-200",
  approved:  "bg-blue-50   text-blue-700   border-blue-200",
  ordered:   "bg-purple-50 text-purple-700 border-purple-200",
  failed:    "bg-red-50    text-red-700    border-red-200",
  cancelled: "bg-slate-100 text-slate-600  border-slate-200",
  low_stock: "bg-amber-50  text-amber-700  border-amber-200",
  inactive:  "bg-slate-100 text-slate-600  border-slate-200",
  high:      "bg-red-50    text-red-700    border-red-200",
  medium:    "bg-amber-50  text-amber-700  border-amber-200",
  low:       "bg-slate-100 text-slate-600  border-slate-200",
};

export function statusColor(status = "") {
  return STATUS_COLORS[status.toLowerCase()] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export const STATUS_DOTS = {
  pending: "bg-amber-500", active: "bg-emerald-500", available: "bg-emerald-500",
  completed: "bg-blue-500", approved: "bg-blue-500", ordered: "bg-purple-500",
  failed: "bg-red-500", cancelled: "bg-slate-400", low_stock: "bg-amber-500",
  inactive: "bg-slate-400", high: "bg-red-500", medium: "bg-amber-500", low: "bg-slate-400",
};

export function statusDot(status = "") {
  return STATUS_DOTS[status.toLowerCase()] ?? "bg-slate-400";
}

export function scoreColor(score) {
  const n = Number(score) || 0;
  if (n >= 75) return "text-emerald-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-500";
}

export function scoreBarColor(score) {
  const n = Number(score) || 0;
  if (n >= 75) return "bg-emerald-400";
  if (n >= 40) return "bg-amber-400";
  return "bg-red-400";
}
