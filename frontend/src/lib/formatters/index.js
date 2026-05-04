export function formatCurrency(value = 0, currency = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-LK");
}
