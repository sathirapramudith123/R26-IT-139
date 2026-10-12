// Helpers for the procurement form.

// Today's date in the browser's timezone (toISOString() gives the UTC date — yesterday in
// Sri Lanka before 05:30)
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const genPrNo = () => `PR-${String(Date.now()).slice(-5)}`;

// Haversine formula — straight-line distance (km) between two lat/lng points.
// Good enough for "which supplier is closest to this delivery point" without
// needing a routing API.
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Expected arrival = order date + the chosen supplier's delivery lead time
// (days). Replaces manually typing an Arrival Date — we now derive it from
// how long the best-match supplier said they take to deliver.
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`); // plain calendar arithmetic in UTC
  d.setUTCDate(d.getUTCDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

// unit_cost becomes the batch cost when the order is RECEIVED
export const emptyItem = { item_name: "", unit: "unit", quantity: "", unit_cost: "" };

// LKR amount with two decimals, e.g. 1,250.00
export const formatLkr = (n) =>
  (Number(n) || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
