import { CACHE_TTL_MS } from "../constants/index";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function round(value, dp = 2) {
  return Math.round((Number(value) || 0) * 10 ** dp) / 10 ** dp;
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? "other";
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

export function sortByDesc(arr, key) {
  return [...arr].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
}

export function sortByAsc(arr, key) {
  return [...arr].sort((a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0));
}

export function sumBy(arr, key) {
  return arr.reduce((s, item) => s + (Number(item[key]) || 0), 0);
}

export function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function cacheSet(key, data, ttl = CACHE_TTL_MS) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch { }
}

export function cacheGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > (ttl ?? CACHE_TTL_MS)) return null;
    return data;
  } catch { return null; }
}

export function cacheClear(key) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(key); } catch { }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
