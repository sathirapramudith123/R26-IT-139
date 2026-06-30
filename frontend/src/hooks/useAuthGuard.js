"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenService } from "@/services/auth/tokenService";

export default function useAuthGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenService.getToken() || !tokenService.getUser()) {
      router.replace("/auth/login");
    }
  }, [router]);
}