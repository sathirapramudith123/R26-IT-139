"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notificationApi } from "@/services/api/notification";

const ICON = { info: "ℹ️", warning: "⚠️", success: "✅", alert: "🚨" };

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  async function loadCount() {
    try { const r = await notificationApi.unreadCount(); setCount(r.count || 0); } catch {}
  }
  async function loadList() {
    try { const d = await notificationApi.list(); setItems(Array.isArray(d) ? d : []); } catch { setItems([]); }
  }

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadList();
  }

  async function readOne(n) {
    if (n.is_read) return;
    try {
      await notificationApi.markRead(n.id);
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function readAll() {
    try {
      await notificationApi.markAllRead();
      setItems((p) => p.map((x) => ({ ...x, is_read: true })));
      setCount(0);
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="btn-ghost relative px-3 py-2 text-base" aria-label="Notifications">
        🔔
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="font-outfit text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</span>
            {count > 0 && (
              <button onClick={readAll} className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div
                    onClick={() => readOne(n)}
                    className={`flex cursor-pointer gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                      !n.is_read ? "bg-teal-50/50 dark:bg-teal-950/20" : ""
                    }`}
                  >
                    <span className="text-lg">{ICON[n.notification_type] || "ℹ️"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600" />}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}