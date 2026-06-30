"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { tokenService } from "@/services/auth/tokenService";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  function handleLogout() { tokenService.clearToken(); router.push("/auth/login"); }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-teal text-white text-base shadow-sm">🌿</div>
          <span className="font-outfit text-lg font-bold text-slate-900">Lanka<span className="text-teal-700">-Link</span></span>
        </Link>
        <nav className="flex items-center gap-1">
          {!isDashboard ? (
            <>
              <Link href="/auth/login" className="btn-ghost text-sm px-4 py-2">Sign in</Link>
              <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2">Sign out</button>
          )}
        </nav>
      </div>
    </header>
  );
}