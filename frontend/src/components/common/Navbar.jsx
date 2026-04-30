"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { tokenService } from "@/services/auth/tokenService";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  function handleLogout() {
    tokenService.clearToken();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-base shadow-sm">
            🌿
          </div>
          <span className="font-outfit text-lg font-bold text-slate-900">
            Lanka<span className="text-primary">-Link</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {!isDashboard ? (
            <>
              <Link href="/auth/login" className="btn-ghost text-sm px-4 py-2">
                Sign in
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">
                Get Started
              </Link>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2">
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
