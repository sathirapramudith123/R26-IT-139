// Sinhala / English text for the web app.
// The English text itself is the key: t("Total Income") returns the Sinhala text when Sinhala is
// selected and a translation exists, otherwise the English text — so a missing translation never breaks.
import si from "@/locales/si.json";

export const LANGUAGES = { en: "English", si: "සිංහල" };

let current = "en";

export function setLanguage(lang) {
  current = lang === "si" ? "si" : "en";
}

export function getLanguage() {
  return current;
}

export function t(text) {
  return current === "si" ? si[text] || text : text;
}
