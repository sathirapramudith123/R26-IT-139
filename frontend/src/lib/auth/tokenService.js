const TOKEN_KEY = "access_token";
const USER_KEY  = "lankalink_user";

function setCookie(name, value, days = 1) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict`;
}
function clearCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export const tokenService = {
  getToken()  { return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY); },
  setToken(t) { if (typeof window === "undefined") return; localStorage.setItem(TOKEN_KEY, t); setCookie(TOKEN_KEY, t, 1); },
  clearToken(){ if (typeof window === "undefined") return; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); clearCookie(TOKEN_KEY); },
  getUser()   { if (typeof window === "undefined") return null; try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  setUser(u)  { if (typeof window === "undefined") return; localStorage.setItem(USER_KEY, JSON.stringify(u)); },
};