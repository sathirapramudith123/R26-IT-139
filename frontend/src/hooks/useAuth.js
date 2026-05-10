"use client";
import { useState } from "react";
import { authApi } from "@/services/api/auth.api";
import { tokenService } from "@/services/auth/tokenService";

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function login({ email, password }) {
    setLoading(true); setError(null);
    try {
      const d = await authApi.login({ email, password });
      tokenService.setToken(d.access_token);
      tokenService.setUser(d.user);
      return d;
    } catch (e) {
      setError(e.message || "Login failed. Check your email and password.");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function register({ full_name, email, password }) {
    setLoading(true); setError(null);
    try {
      const d = await authApi.register({ full_name, email, password });
      tokenService.setToken(d.access_token);
      tokenService.setUser(d.user);
      return d;
    } catch (e) {
      setError(e.message || "Registration failed.");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    tokenService.clearToken();
  }

  return { loading, error, login, register, logout };
}
