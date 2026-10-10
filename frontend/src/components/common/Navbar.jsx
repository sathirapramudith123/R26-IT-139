"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { tokenService } from "@/services/auth/tokenService";
import { ThemeToggle } from "@/components/ThemeProvider";
import { LanguageToggle } from "@/components/LanguageProvider";
import NotificationBell from "./NotificationBell";

import { t } from "@/lib/i18n";
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  function handleLogout() {
    tokenService.clearToken();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-9xl items-center justify-between gap-2 px-3 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <Image
              src="/images/lankalinklogo.png"
              alt={t("Lanka-Link")}
              width={30}
              height={30}
              className="object-contain"
              priority
            />
          </div>
          <span className="hidden font-display text-base font-bold text-slate-900 min-[440px]:inline sm:text-lg dark:text-slate-100">
            {t("Lanka")}
            <span className="text-brand-700 dark:text-brand-400">{t("-Link")}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {isDashboard && <NotificationBell />}
          <LanguageToggle />
          <ThemeToggle />
          {!isDashboard ? (
            <>
              {/* The button for the page you are on is left out. On phones there is room for one:
                  "Sign in" (the home page hero and the login page also link to registration). */}
              {pathname !== "/auth/login" && (
                <Link href="/auth/login" className="btn-ghost whitespace-nowrap px-3 py-2 text-sm sm:px-4">
                  {t("Sign in")}
                </Link>
              )}
              {pathname !== "/auth/register" && (
                <Link
                  href="/auth/register"
                  className={`btn-primary whitespace-nowrap px-3 py-2 text-sm sm:px-4 ${
                    pathname === "/auth/login" ? "" : "hidden sm:inline-flex"
                  }`}
                >
                  {t("Get Started")}
                </Link>
              )}
            </>
          ) : (
            <button onClick={handleLogout} className="btn-ghost whitespace-nowrap px-3 py-2 text-sm sm:px-4">
              {t("Sign out")}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
