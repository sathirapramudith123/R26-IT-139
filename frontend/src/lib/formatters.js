// LKR 1,250.75 — cents everywhere (pass false for whole rupees)
export function formatCurrency(value = 0, decimals = true) {
  const n = Number(value) || 0;
  return (
    "LKR " +
    n.toLocaleString("en-LK", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}
export function formatDate(value, locale = "en-LK") {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return "—";
  }
}
export function formatDateTime(value, locale = "en-LK") {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return "—";
  }
}
export function titleCase(str = "") {
  return String(str)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
export function scoreColor(score) {
  const n = Number(score) || 0;
  if (n >= 75) return "text-emerald-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-500";
}

// The week the demand forecast is for: the model uses completed Monday–Sunday weeks, so it
// forecasts the week after the last completed one, i.e. the current week. "10/19–10/25"
export function forecastWeekRange(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  return `${md(monday)}–${md(sunday)}`;
}
