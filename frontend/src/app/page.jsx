import Link from "next/link";
import {
  ArrowRight, Brain, CalendarDays, CreditCard, Landmark, Package, Scale,
  ShieldCheck, ShoppingCart, Sparkles, TrendingUp, TriangleAlert,
} from "lucide-react";

const flow = [
  { icon: Package, title: "Record", desc: "Sales, purchases, stock and banking in one digital ledger." },
  { icon: TrendingUp, title: "Forecast", desc: "Next week's demand per item, aware of Avurudu and festivals." },
  { icon: ShoppingCart, title: "Restock", desc: "Buy when stock falls below what the forecast needs until delivery." },
  { icon: CreditCard, title: "Grow", desc: "Steady stock and records build a credit-readiness score." },
];

const modules = [
  {
    icon: CreditCard, title: "Sales & Finance",
    desc: "Daily transactions, journal and profit & loss.",
    ai: "Credit-readiness score and a loan limit from your net cash flow.",
  },
  {
    icon: Package, title: "Smart Inventory",
    desc: "Stock levels, batches and low-stock alerts.",
    ai: "Weekly demand forecast for every item that sells.",
  },
  {
    icon: ShoppingCart, title: "Procurement",
    desc: "Suppliers, purchase orders and delivery lead times.",
    ai: "Buy now or wait, from stock, forecast and price trend.",
  },
  {
    icon: Landmark, title: "Agency Banking",
    desc: "Deposits, withdrawals and transfers for partner banks.",
    ai: "Flags unusual transactions; CBSL daily limits enforced.",
  },
];

const trust = [
  {
    icon: Brain, title: "Explainable, not a black box",
    desc: "Every prediction shows what pushed it up and what held it back, in plain words.",
  },
  {
    icon: Scale, title: "Rules and ML together",
    desc: "CBSL limits are hard rules that are always enforced. The models flag what rules cannot see.",
  },
  {
    icon: ShieldCheck, title: "Tested against simple methods",
    desc: "On held-out data the demand forecast is about 22% more accurate than “same as last week”.",
  },
];

function PreviewCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-white/10 blur-2xl" aria-hidden />
      <div className="relative space-y-3 rounded-3xl border border-white/20 bg-white/95 p-5 text-slate-800 shadow-2xl backdrop-blur dark:bg-slate-900/95 dark:text-slate-100">
        <div className="flex items-center justify-between">
          <p className="font-outfit text-sm font-bold">Your business this week</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Sample data
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 dark:bg-teal-950/50">
            <p className="text-[11px] font-medium text-teal-700 dark:text-teal-300">Credit score</p>
            <p className="font-outfit text-3xl font-extrabold text-teal-700 dark:text-teal-300">82</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ready to apply</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Sales next week</p>
            <p className="font-outfit text-3xl font-extrabold text-amber-600 dark:text-amber-300">≈353</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">units · ≈ Rs 70,900</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <div>
            <p className="text-sm font-semibold">Fresh Milk</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Stock 28 · Reorder 28 (≈23/week forecast)</p>
          </div>
          <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Buy
          </span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Unusual transaction</p>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Cash withdrawal · LKR 50,000 — why:</p>
          <div className="mt-2 space-y-1.5">
            {[["Amount vs usual", "w-4/5"], ["Transaction type", "w-1/2"], ["Day of month", "w-1/5"]].map(([label, w]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                <span className="h-1.5 flex-1 rounded-full bg-rose-100 dark:bg-rose-950">
                  <span className={`block h-1.5 rounded-full bg-rose-400 ${w}`} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-16 pb-12 md:space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-teal px-6 py-14 text-white sm:px-10 md:px-16 md:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl" aria-hidden />

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-yellow-300" /> Built for rural Sri Lanka
            </span>
            <h1 className="font-outfit text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              Run your kade <span className="text-yellow-300">smarter.</span>
            </h1>
            <p className="max-w-xl text-lg text-white/85">
              One app for the small shop and agency-banking agent: record every sale, know what to restock
              and when, build a credit record, and keep customers&apos; money safe — with AI that explains itself.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#ffffff] px-6 py-3 text-sm font-semibold text-[#0f766e] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Get started <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Sign in
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <li className="flex items-center gap-1.5"><Brain className="h-4 w-4" /> Explainable AI</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> CBSL limits built in</li>
              <li className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Avurudu-aware forecasts</li>
            </ul>
          </div>
          <PreviewCard />
        </div>
      </section>

      {/* One ledger, four decisions */}
      <section>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">How it works</p>
          <h2 className="mt-2 font-outfit text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">One ledger, connected decisions</h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            What you record once feeds every insight. The demand forecast sets when to restock, and steady
            stock improves your credit score.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="card h-full transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg dark:hover:border-teal-700">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-teal text-white shadow-md">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="bg-gradient-to-br from-teal-500 to-cyan-600 bg-clip-text font-outfit text-4xl font-extrabold text-transparent dark:from-teal-300 dark:to-cyan-400">0{i + 1}</span>
                </div>
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
              {i < flow.length - 1 && (
                <span
                  className="absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-600 shadow-sm dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300 lg:flex"
                  aria-hidden
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Modules */}
      <section>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Modules</p>
          <h2 className="mt-2 font-outfit text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">Four modules, one shop</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="card group flex flex-col transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg dark:hover:border-teal-700">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-teal text-white shadow-md">
                <m.icon className="h-6 w-6" />
              </span>
              <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-white">{m.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{m.desc}</p>
              <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {m.ai}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 px-6 py-14 text-white dark:border-teal-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-teal-900/60 sm:px-10 md:px-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" aria-hidden />
        <div className="relative mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">Why you can trust it</p>
          <h2 className="mt-2 font-outfit text-3xl font-bold md:text-4xl">AI you can check</h2>
        </div>
        <div className="relative grid gap-6 md:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-teal-400/40 hover:bg-white/10">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/15">
                <t.icon className="h-6 w-6 text-teal-300" />
              </span>
              <h3 className="mt-4 font-outfit text-lg font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-5 text-center">
        <h2 className="font-outfit text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          Ready to run your kade <span className="text-teal-600 dark:text-teal-400">smarter?</span>
        </h2>
        <p className="max-w-lg text-slate-500 dark:text-slate-400">Create an account and start recording your sales today.</p>
        <Link
          href="/auth/register"
          className="group inline-flex items-center gap-2 rounded-xl gradient-teal px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Get started <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
