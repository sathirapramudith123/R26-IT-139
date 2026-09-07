import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-9xl flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <Image src="/lankalinklogo.png" alt="Lanka-Link" width={22} height={22} className="object-contain" />
          </div>
          <span className="font-outfit text-sm font-semibold text-slate-700 dark:text-slate-200">Lanka-Link</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 Lanka-Link · Smart Merchant Support Platform</p>
      </div>
    </footer>
  );
}