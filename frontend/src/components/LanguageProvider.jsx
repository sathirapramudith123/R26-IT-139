"use client";

import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { setLanguage } from "@/lib/i18n";

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

// Holds the chosen language (saved in the browser) and re-renders the whole app when it changes.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    try {
      if (localStorage.getItem("lang") === "si") setLangState("si");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // t() reads the module-level language, so set it before the children render
  setLanguage(lang);

  const setLang = (next) => {
    try {
      localStorage.setItem("lang", next);
    } catch {}
    setLangState(next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

// Navbar button: switches between Sinhala and English
export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "si" ? "en" : "si")}
      aria-label={lang === "si" ? "Switch to English" : "සිංහලට මාරු වන්න"}
      title={lang === "si" ? "Switch to English" : "සිංහලට මාරු වන්න"}
      className="btn-ghost !px-3 !py-2 text-sm font-semibold"
    >
      {lang === "si" ? "English" : "සිංහල"}
    </button>
  );
}
