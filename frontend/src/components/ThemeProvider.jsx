"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { t } from "@/lib/i18n";
const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // the <head> script already applied the class before paint;
    // just sync React state to whatever it set.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={t("Toggle light or dark mode")}
      className="btn-ghost text-base !px-3 !py-2"
      title={theme === "light" ? t("Switch to dark") : t("Switch to light")}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
