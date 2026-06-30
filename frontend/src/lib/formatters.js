export function formatCurrency(value = 0, decimals = false) {
  const n = Number(value) || 0;
  return "LKR " + n.toLocaleString("en-LK", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}
export function formatDate(value, locale = "en-LK") {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(locale); } catch { return "—"; }
}
export function formatDateTime(value, locale = "en-LK") {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(locale); } catch { return "—"; }
}
export function titleCase(str = "") {
  return String(str).split(/[-_\s]+/).filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
export function scoreColor(score) {
  const n = Number(score) || 0;
  if (n >= 75) return "text-emerald-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-500";
}