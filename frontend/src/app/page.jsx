import Link from "next/link";

const features = [
  { icon: "💳", title: "Sales & Finance", desc: "Track transactions and get a credit-readiness score." },
  { icon: "📦", title: "Smart Inventory", desc: "Stock levels with low-stock alerts and demand forecasting." },
  { icon: "🛒", title: "Procurement", desc: "Decide when to buy with supplier insights." },
  { icon: "🏦", title: "Agency Banking", desc: "Deposits, withdrawals, transfers with anomaly detection." },
];

export default function HomePage() {
  return (
    <div className="space-y-16 pb-12">
      <section className="rounded-3xl gradient-teal px-8 py-16 text-white md:px-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">🇱🇰 Built for Rural Sri Lanka</span>
            <h1 className="font-outfit text-4xl font-extrabold leading-tight md:text-5xl">Run your kade <span className="text-yellow-300">smarter.</span></h1>
            <p className="text-lg text-white/80">A digital platform for micro-merchants — inventory, finance, banking, procurement, with explainable ML insights.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/register" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-lg">Get Started →</Link>
              <Link href="/auth/login" className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white">Sign In</Link>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-8 text-center font-outfit text-3xl font-bold text-slate-900">Four integrated modules</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => (
            <div key={f.title} className="card">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-2xl">{f.icon}</div>
              <h3 className="font-outfit font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}