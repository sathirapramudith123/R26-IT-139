export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function titleCase(value = "") {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
