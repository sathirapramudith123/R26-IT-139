"use client";

import { useEffect } from "react";

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg animate-slide-up rounded-2xl bg-white p-6 shadow-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-outfit text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
