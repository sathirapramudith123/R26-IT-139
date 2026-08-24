export const generateId = (prefix) =>
  `${prefix}_${Math.random().toString(16).slice(2, 14)}`;

export const formatRs = (value) =>
  `Rs ${Number(value || 0).toFixed(2)}`;