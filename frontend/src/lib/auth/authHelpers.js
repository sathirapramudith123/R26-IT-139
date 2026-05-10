import { tokenService } from "@/services/auth/tokenService";
import { ROLES } from "@/lib/constants/index";

export function getCurrentUser() {
  return tokenService.getUser();
}

export function getCurrentRole() {
  return getCurrentUser()?.role ?? ROLES.MERCHANT;
}

export function isAdmin() {
  return getCurrentRole() === ROLES.ADMIN;
}

export function isBankAgent() {
  const role = getCurrentRole();
  return role === ROLES.BANK_AGENT || role === ROLES.ADMIN;
}

export function isMerchant() {
  return getCurrentRole() === ROLES.MERCHANT;
}

export function hasRole(requiredRole) {
  const role = getCurrentRole();
  if (requiredRole === ROLES.MERCHANT)   return true;
  if (requiredRole === ROLES.BANK_AGENT) return role === ROLES.BANK_AGENT || role === ROLES.ADMIN;
  if (requiredRole === ROLES.ADMIN)      return role === ROLES.ADMIN;
  return false;
}

export function isAuthenticated() {
  return !!tokenService.getToken();
}

export function canAccessAgencyBanking() {
  return isBankAgent();
}

export function redirectIfNotAuth(router) {
  if (!isAuthenticated()) {
    router.push("/auth/login");
    return true;
  }
  return false;
}

export function redirectIfNotRole(router, requiredRole) {
  if (!hasRole(requiredRole)) {
    router.push("/dashboard");
    return true;
  }
  return false;
}
