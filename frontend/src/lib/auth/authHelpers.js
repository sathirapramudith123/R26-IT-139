import { tokenService } from "@/services/auth/tokenService";

export function isAuthenticated() {
  return Boolean(tokenService.getToken());
}

export function getAuthHeader() {
  const token = tokenService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
