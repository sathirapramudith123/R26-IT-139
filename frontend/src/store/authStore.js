import { tokenService } from "@/services/auth/tokenService";

let _listeners = [];
let _state = {
  user:  null,
  token: null,
  isAuthenticated: false,
};

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getAuthState() {
  if (_state.token) return _state;
  const token = tokenService.getToken();
  const user  = tokenService.getUser();
  if (token) {
    _state = { user, token, isAuthenticated: true };
  }
  return _state;
}

export function setAuth(token, user) {
  tokenService.setToken(token);
  tokenService.setUser(user);
  _state = { user, token, isAuthenticated: true };
  notify();
}

export function clearAuth() {
  tokenService.clearToken();
  _state = { user: null, token: null, isAuthenticated: false };
  notify();
}

export function subscribeAuth(listener) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter(l => l !== listener); };
}
