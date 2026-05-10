import Link from "next/link";

const features = [
  { icon: "📒", title: "Digital Financial Ledger", desc: "Record sales, expenses and agency commissions. Auto-generates double-entry journal entries and trial balance." },
  { icon: "📦", title: "Offline-First Inventory", desc: "Track stock levels with automatic low-stock alerts. Works without internet — syncs when connectivity returns." },
  { icon: "🏦", title: "Agency Banking", desc: "Act as a local banking touchpoint. Handle deposits, withdrawals and transfers with full CBSL compliance." },
  { icon: "🛒", title: "Smart Procurement DSS", desc: "Rule-based supplier scoring and ranking. Get explainable procurement recommendations without complex AI." },
];

const stats = [
  { value: "4", label: "Core Modules" },
  { value: "CBSL", label: "Compliant" },
  { value: "100%", label: "Offline-First" },
  { value: "LKR", label: "Sri Lankan" },
];

export default function HomePage() {
  return (
    <div className="space-y-70 pb-16">
      <section className="relative overflow-hidden rounded-3xl gradient-teal px-8 py-16 text-white md:px-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/5" />
        </div>
        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
              🇱🇰 Built for Rural Sri Lanka
            </span>
            <h1 className="font-outfit text-4xl font-extrabold leading-tight md:text-5xl">
              Run your kade<br /><span className="text-yellow-300">smarter.</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Lanka-Link is an offline-first digital system for rural micro-merchants. Manage inventory, finances, banking and procurement — even without internet.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-lg hover:shadow-xl transition">
                Get Started →
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                View Dashboard
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-5 border border-white/20">
                <div className="font-outfit text-3xl font-bold text-white">{s.value}</div>
                <div className="mt-1 text-sm text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-10 text-center">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-700">Research System</span>
          <h2 className="mt-3 font-outfit text-3xl font-bold text-slate-900">Four integrated modules</h2>
          <p className="mt-2 text-slate-500">Designed for rural micro-merchants in low-connectivity environments.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card hover:-translate-y-1 transition-all duration-200">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-2xl">{f.icon}</div>
              <h3 className="font-outfit font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="font-outfit text-3xl font-bold text-slate-900">Ready to get started?</h2>
        <p className="mt-3 text-slate-500">Create your merchant account and start managing your business digitally.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/auth/register" className="btn-primary px-8 py-3 text-base">Start for Free</Link>
          <Link href="/auth/login" className="btn-secondary px-8 py-3 text-base">Sign In</Link>
        </div>
      </section>
    </div>
  );
}
