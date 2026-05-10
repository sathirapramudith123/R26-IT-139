"use client";
import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { tokenService } from "@/services/auth/tokenService";
import MerchantDashboard  from "@/components/dashboard/MerchantDashboard";
import BankAgentDashboard from "@/components/dashboard/BankAgentDashboard";
import AdminDashboard     from "@/components/dashboard/AdminDashboard";

export default function DashboardPage() {
  useAuthGuard();
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(tokenService.getSessionRole());
  }, []);

  if (!role) return null;
  if (role === "admin")      return <AdminDashboard />;
  if (role === "bank_agent") return <BankAgentDashboard />;
  return <MerchantDashboard />;
}
