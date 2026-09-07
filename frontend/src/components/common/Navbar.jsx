"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { tokenService } from "@/services/auth/tokenService";
import { ThemeToggle } from "@/components/ThemeProvider";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  function handleLogout() { tokenService.clearToken(); router.push("/auth/login"); }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-9xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <Image
              src="/images/lankalinklogo.png"
              alt="Lanka-Link"
              width={30}
              height={30}
              className="object-contain"
              priority
            />
          </div>
          <span className="font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">
            Lanka<span className="text-teal-700 dark:text-teal-400">-Link</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {isDashboard && <NotificationBell />}
          <ThemeToggle />
          {!isDashboard ? (
            <>
              <Link href="/auth/login" className="btn-ghost px-4 py-2 text-sm">Sign in</Link>
              <Link href="/auth/register" className="btn-primary px-4 py-2 text-sm">Get Started</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm">Sign out</button>
          )}
        </nav>
      </div>
    </header>
  );
}