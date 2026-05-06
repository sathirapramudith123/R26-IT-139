export function required(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export function validateEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
