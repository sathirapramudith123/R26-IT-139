export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-base">🌿</span>
            <span className="font-outfit text-sm font-semibold text-slate-700">Lanka-Link</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Lanka-Link. Empowering rural micro-merchants across Sri Lanka.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>Offline-First</span><span>·</span><span>CBSL Compliant</span><span>·</span><span>Rule-Based DSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
