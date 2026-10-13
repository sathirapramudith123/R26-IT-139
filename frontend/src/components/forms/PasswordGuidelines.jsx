import { Check } from "lucide-react";
import { PASSWORD_GUIDELINES } from "@/lib/auth/passwordPolicy";
import { t } from "@/lib/i18n";

/** Live checklist of the password rules: each one turns green once the password meets it. */
export default function PasswordGuidelines({ password = "" }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t("Password guidelines:")}</p>
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {PASSWORD_GUIDELINES.map(({ label, ok }) => {
          const met = ok(password);
          return (
            <li
              key={label}
              className={`flex items-center gap-2 text-xs transition-colors ${
                met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {met ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <span
                  className="mx-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600"
                  aria-hidden="true"
                />
              )}
              <span>
                {t(label)}
                <span className="sr-only">{met ? ` — ${t("done")}` : ""}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
