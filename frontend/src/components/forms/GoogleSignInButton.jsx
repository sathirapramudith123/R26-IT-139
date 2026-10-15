"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { t, getLanguage } from "@/lib/i18n";

// "Sign in with Google" (Google Identity Services). Google gives us an ID token (credential);
// the backend verifies it and signs the user in (POST /auth/google). Shown only when
// NEXT_PUBLIC_GOOGLE_CLIENT_ID is set in frontend/.env.local.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[src="${SCRIPT}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), { once: true });
  });
}

export default function GoogleSignInButton({ onCredential, text = "signin_with" }) {
  const box = useRef(null);
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const handler = useRef(onCredential);
  handler.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => r?.credential && handler.current(r.credential),
        });
        box.current.innerHTML = "";
        window.google.accounts.id.renderButton(box.current, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text,
          width: Math.min(box.current.offsetWidth || 320, 400),
          locale: getLanguage() === "si" ? "si" : "en",
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [theme, text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        {t("or")}
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      {failed ? (
        <p className="text-center text-xs text-slate-500">{t("Google sign-in could not load.")}</p>
      ) : (
        <div ref={box} className="flex w-full justify-center" />
      )}
    </div>
  );
}
