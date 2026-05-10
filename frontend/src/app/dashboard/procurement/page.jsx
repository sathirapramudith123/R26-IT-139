"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { tokenService } from "@/services/auth/tokenService";
import AdminProcurementPage from "./AdminProcurementPage";
import MerchantProcurementPage from "./MerchantProcurementPage";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function ProcurementPage() {
  useAuthGuard();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const user = tokenService.getUser();
    setRole(user?.role ?? "merchant");
  }, []);

  if (!role) return <LoadingSpinner label="Loading..." />;
  if (role === "admin") return <AdminProcurementPage />;
  return <MerchantProcurementPage />;
}