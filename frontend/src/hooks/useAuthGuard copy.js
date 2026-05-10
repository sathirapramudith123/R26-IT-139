"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenService } from "@/services/auth/tokenService";
import { ROLES } from "@/lib/constants/index";

/**
 * useAuthGuard — client-side route protection.
 *
 * Call at the top of any dashboard page that needs protection.
 *
 * Usage:
 *   useAuthGuard()                          // require any logged-in user
 *   useAuthGuard(ROLES.BANK_AGENT)          // require bank_agent or admin
 *   useAuthGuard(ROLES.ADMIN)               // require admin only
 *
 * Redirects to /auth/login if not authenticated.
 * Redirects to /dashboard   if authenticated but wrong role.
 */
export default function useAuthGuard(requiredRole = null) {
  const router = useRouter();

  useEffect(() => {
    const token = tokenService.getToken();
    const user  = tokenService.getUser();

    if (!token || !user) {
      router.replace("/auth/login");
      return;
    }

    if (!requiredRole) return;

    const role = user.role ?? ROLES.MERCHANT;

    const allowed =
      requiredRole === ROLES.MERCHANT    ? true :
      requiredRole === ROLES.BANK_AGENT  ? (role === ROLES.BANK_AGENT || role === ROLES.ADMIN) :
      requiredRole === ROLES.ADMIN       ? (role === ROLES.ADMIN) :
      false;

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [router, requiredRole]);
}
