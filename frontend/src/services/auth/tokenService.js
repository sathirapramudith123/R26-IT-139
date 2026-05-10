const TOKEN_KEY = "access_token";
const USER_KEY  = "lankalink_user";

function setClientCookie(name, value, days = 1) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict`;
}

function clearClientCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export const tokenService = {
  getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(t) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, t);
    setClientCookie(TOKEN_KEY, t, 1);
  },

  clearToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearClientCookie(TOKEN_KEY);
  },

  getUser() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },

  setUser(u) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  },

  // The role the user is acting as this session (may differ from actual_role)
  getSessionRole() {
    return this.getUser()?.role ?? "merchant";
  },

  // The user's real DB role (always their highest permission level)
  getActualRole() {
    return this.getUser()?.actual_role ?? this.getSessionRole();
  },

  // Available roles this user can switch to
  getAvailableRoles() {
    const actual = this.getActualRole();
    const map = {
      merchant:   ["merchant"],
      bank_agent: ["merchant", "bank_agent"],
      admin:      ["merchant", "bank_agent", "admin"],
    };
    return map[actual] ?? ["merchant"];
  },
};
