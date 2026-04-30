import Link from "next/link";

const features = [
  { icon: "📦", title: "Smart Inventory", desc: "Track stock levels with low-inventory alerts and automated reorder suggestions." },
  { icon: "🏦", title: "Savings & Term Vault", desc: "Manage savings goals and group term vault contributions with ease." },
  { icon: "🤝", title: "Supplier Network", desc: "Manage procurement and supplier relationships in one unified portal." },
  { icon: "🤖", title: "AI Smart Agent", desc: "Get intelligent insights and recommendations powered by business analytics." },
  { icon: "💳", title: "Transaction Hub", desc: "Full financial ledger with real-time transaction tracking and history." },
  { icon: "📡", title: "Offline-First", desc: "Works without internet via IndexedDB, syncs automatically when reconnected." }
];

const stats = [
  { value: "10,000+", label: "Merchants" },
  { value: "LKR 2B+", label: "Transactions" },
  { value: "99.9%", label: "Uptime" },
  { value: "25", label: "Districts" }
];

export default function HomePage() {
  return (
    <div className="space-y-20 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-teal px-8 py-16 text-white md:px-16 md:py-24">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/5" />
          <div className="absolute right-40 bottom-10 h-40 w-40 rounded-full bg-white/5" />
        </div>

        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🇱🇰 Built for Sri Lanka
            </span>
            <h1 className="font-outfit text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
              Run your kade<br />
              <span className="text-accent-light">smarter.</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Lanka-Link is the all-in-one ERP and banking gateway for rural micro-merchants. Manage inventory, savings, suppliers and finances — even offline.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/auth/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
                Get Started Free →
              </Link>
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95">
                View Dashboard
              </Link>
            </div>
          </div>

          {/* Stats card */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/20">
                <div className="font-outfit text-3xl font-bold text-white">{s.value}</div>
                <div className="mt-1 text-sm text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mb-10 text-center">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Platform Features
          </span>
          <h2 className="mt-3 font-outfit text-3xl font-bold text-slate-900">
            Everything you need to grow
          </h2>
          <p className="mt-2 text-slate-500">Built for the realities of rural commerce in Sri Lanka.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-1">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="font-outfit font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="font-outfit text-3xl font-bold text-slate-900">Ready to modernize your business?</h2>
        <p className="mt-3 text-slate-500">Join thousands of merchants already using Lanka-Link across Sri Lanka.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/auth/register" className="btn-primary px-8 py-3 text-base">
            Start for Free
          </Link>
          <Link href="/auth/login" className="btn-secondary px-8 py-3 text-base">
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}
