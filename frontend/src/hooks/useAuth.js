"use client";

import { useState } from "react";
import { authApi } from "@/services/api/auth.api";
import { tokenService } from "@/services/auth/tokenService";

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function login(values) {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(values);
      tokenService.setToken(data.access_token);
      tokenService.setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(values) {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register(values);
      tokenService.setToken(data.access_token);
      tokenService.setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    tokenService.clearToken();
  }

  return { loading, error, login, register, logout };
}
