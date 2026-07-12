export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-9xl px-4 py-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span>🌿</span>
          <span className="font-outfit text-sm font-semibold text-slate-700">Lanka-Link</span>
        </div>
        <p className="text-xs text-slate-400">© 2026 Lanka-Link · Smart Merchant Support Platform</p>
      </div>
    </footer>
  );
}