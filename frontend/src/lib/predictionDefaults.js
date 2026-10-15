// Shared helpers for the "Try it yourself" prediction forms.
import { t } from "@/lib/i18n";

/** ISO week and ISO year of a date (the Thursday of the week decides the year). */
export function isoWeekYear(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const year = x.getUTCFullYear();
  const week = Math.ceil(((x - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return { year, week };
}

/** Days until the next Avurudu (14 April). */
export function daysToAvurudu(d = new Date()) {
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let next = new Date(today.getFullYear(), 3, 14);
  if (next < today) next = new Date(today.getFullYear() + 1, 3, 14);
  return Math.round((next - today) / 864e5);
}

/** A form field for PredictionForm, with a translated label and optional hint. */
export const field = (name, label, type, def, hint) => ({
  name,
  get label() {
    return t(label);
  },
  type,
  default: def,
  ...(hint && {
    get hint() {
      return t(hint);
    },
  }),
});
