export const up = (v) => (v ? String(v).toUpperCase() : v);
export const low = (v) => (v ? String(v).toLowerCase() : v);

const ENUM_FIELDS = [
  "transaction_type", "payment_method", "unit", "item_status",
  "supplier_status", "procurement_status", "banking_status",
  "notification_type", "notification_category",
];

/** Rename the table-specific id to `id`, and lowercase enum values for the frontend. */
export function toClient(row, idField) {
  if (!row) return row;
  const { [idField]: id, ...rest } = row;
  const out = { id, ...rest };
  for (const k of ENUM_FIELDS) if (out[k]) out[k] = low(out[k]);
  return out;
}

export const toClientList = (rows, idField) =>
  Array.isArray(rows) ? rows.map((r) => toClient(r, idField)) : [];