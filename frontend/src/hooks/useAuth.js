"use client";
import { useState } from "react";
import { authApi } from "@/services/api/auth";
import { tokenService } from "@/services/auth/tokenService";

function normalizeUser(u = {}) {
  return { ...u, full_name: u.full_name ?? u.fullName ?? "" };
}

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function login({ email, password }) {
    setLoading(true); setError(null);
    try {
      const d = await authApi.login({ email, password });
      tokenService.setToken(d.token);
      tokenService.setUser(normalizeUser(d.user));
      return d;
    } catch (e) { setError(e.message || "Login failed."); throw e; }
    finally { setLoading(false); }
  }

  async function register({ full_name, email, password }) {
    setLoading(true); setError(null);
    try {
      await authApi.register({ fullName: full_name, email, password });
      const d = await authApi.login({ email, password });
      tokenService.setToken(d.token);
      tokenService.setUser(normalizeUser(d.user));
      return d;
    } catch (e) { setError(e.message || "Registration failed."); throw e; }
    finally { setLoading(false); }
  }

  function logout() { tokenService.clearToken(); }
  return { loading, error, login, register, logout };
}