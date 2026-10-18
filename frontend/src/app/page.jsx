"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CreditCard,
  Landmark,
  Package,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { t } from "@/lib/i18n";
import { useCountUp, useInView, useReducedMotion, useScrollProgress } from "@/lib/motion";
const flow = [
  {
    icon: Package,
    get title() {
      return t("Record");
    },
    get desc() {
      return t("Sales, purchases, stock and banking in one digital ledger.");
    },
  },
  {
    icon: TrendingUp,
    get title() {
      return t("Forecast");
    },
    get desc() {
      return t("Next week's demand per item, aware of Avurudu and festivals.");
    },
  },
  {
    icon: ShoppingCart,
    get title() {
      return t("Restock");
    },
    get desc() {
      return t("Buy when stock falls below what the forecast needs until delivery.");
    },
  },
  {
    icon: CreditCard,
    get title() {
      return t("Grow");
    },
    get desc() {
      return t("Steady stock and records build a credit-readiness score.");
    },
  },
];

const modules = [
  {
    icon: CreditCard,
    get title() {
      return t("Sales & Finance");
    },
    get desc() {
      return t("Daily transactions, journal and profit & loss.");
    },
    get ai() {
      return t("Credit-readiness score and a loan limit from your net cash flow.");
    },
  },
  {
    icon: Package,
    get title() {
      return t("Smart Inventory");
    },
    get desc() {
      return t("Stock levels, batches and low-stock alerts.");
    },
    get ai() {
      return t("Weekly demand forecast for every item that sells.");
    },
  },
  {
    icon: ShoppingCart,
    get title() {
      return t("Procurement");
    },
    get desc() {
      return t("Suppliers, purchase orders and delivery lead times.");
    },
    get ai() {
      return t("Buy now or wait, from stock, forecast and price trend.");
    },
  },
  {
    icon: Landmark,
    get title() {
      return t("Agency Banking");
    },
    get desc() {
      return t("Deposits, withdrawals and transfers for partner banks.");
    },
    get ai() {
      return t("Flags unusual transactions; CBSL daily limits enforced.");
    },
  },
];

const trust = [
  {
    icon: Brain,
    get title() {
      return t("Explainable, not a black box");
    },
    get desc() {
      return t("Every prediction shows what pushed it up and what held it back, in plain words.");
    },
  },
  {
    icon: Scale,
    get title() {
      return t("Rules and ML together");
    },
    get desc() {
      return t("CBSL limits are hard rules that are always enforced. The models flag what rules cannot see.");
    },
  },
  {
    icon: ShieldCheck,
    get title() {
      return t("Tested against simple methods");
    },
    get desc() {
      return t("On held-out data the demand forecast is about 22% more accurate than “same as last week”.");
    },
  },
];

// headline results of the four models, measured on test data (see ML model/README.md)
const results = [
  {
    value: "21.7%",
    show: (v) => `${v.toFixed(1)}%`,
    to: 21.7,
    get label() {
      return t("lower error than “same as last week” for the weekly demand forecast");
    },
  },
  {
    value: "0.839",
    show: (v) => v.toFixed(3),
    to: 0.839,
    get label() {
      return t("ROC-AUC for credit readiness — better than the usual bank rules");
    },
  },
  {
    value: "2.2%",
    show: (v) => `${v.toFixed(1)}%`,
    to: 2.2,
    get label() {
      return t("saved on the purchase bill by following Buy / Wait");
    },
  },
  {
    value: "136 → 19",
    show: (v) => `136 → ${Math.round(136 - v)}`,
    to: 117,
    get label() {
      return t("false alarms per 1,000 honest banking customers");
    },
  },
];

// sample weekly sales for the phone preview (last 6 weeks + next week's forecast)
const WEEKS = [52, 61, 48, 70, 66, 78];
const FORECAST = 84;

/* A phone showing what the shop owner sees — sample data, not a live screen.
   On load the week "plays out": sales bars grow, the forecast appears, the score counts up,
   the restock advice pops in and the anomaly explains itself. `tilt` follows the cursor. */
function PhonePreview({ tilt }) {
  const max = Math.max(...WEEKS, FORECAST);
  const reduced = useReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), 250);
    return () => clearTimeout(id);
  }, []);
  const live = on || reduced;
  const score = useCountUp(82, live, 1600);
  const units = useCountUp(353, live, 1800);
  const grow = "transition-all duration-700 ease-out motion-reduce:transition-none";

  return (
    <div className="relative mx-auto w-full max-w-[340px] motion-safe:animate-float">
      <div
        className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-brand-400/30 to-accent/20 blur-2xl dark:from-brand-500/20 dark:to-accent/10"
        aria-hidden
      />
      <div
        className="relative rounded-[2.6rem] border-[10px] border-slate-900 bg-slate-50 shadow-2xl transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-slate-950"
        style={{ transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}
      >
        {/* notch */}
        <div className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900 dark:bg-slate-700" />

        <div className="space-y-3 px-4 pb-5 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("Your business this week")}</p>
              <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                {t("Ayubowan 👋")}
              </p>
            </div>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {t("Sample data")}
            </span>
          </div>

          {/* credit score: the ring fills while the number counts up */}
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="4"
                  className="stroke-brand-100 dark:stroke-brand-950"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 97.4} 97.4`}
                  className="stroke-brand-600 dark:stroke-brand-400"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold tabular-nums text-brand-700 dark:text-brand-300">
                {Math.round(score)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{t("Credit score")}</p>
              <p
                className={`text-[11px] font-medium text-emerald-600 transition-opacity delay-[1400ms] duration-500 dark:text-emerald-400 ${live ? "opacity-100" : "opacity-0"}`}
              >
                {t("Ready to apply")}
              </p>
            </div>
          </div>

          {/* demand forecast: past weeks grow one by one, then next week's forecast */}
          <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {t("Sales next week")}
              </p>
              <p className="font-display text-lg font-extrabold tabular-nums text-amber-600 dark:text-amber-300">
                ≈{Math.round(units)}
              </p>
            </div>
            <div className="mt-2 flex h-14 items-end gap-1.5">
              {WEEKS.map((v, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t bg-brand-200 dark:bg-brand-900 ${grow}`}
                  style={{ height: live ? `${(v / max) * 100}%` : "4%", transitionDelay: `${i * 110}ms` }}
                />
              ))}
              <span
                className={`flex-1 rounded-t border-2 border-dashed border-amber-500 bg-amber-100 dark:bg-amber-950 ${grow}`}
                style={{
                  height: live ? `${(FORECAST / max) * 100}%` : "4%",
                  opacity: live ? 1 : 0,
                  transitionDelay: "800ms",
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              {t("units · ≈ Rs 70,900")}
            </p>
          </div>

          {/* restock: the advice pops in once the forecast is known */}
          <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{t("Fresh Milk")}</p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {t("Stock 28 · Reorder 28 (≈23/week forecast)")}
              </p>
            </div>
            <span className="relative ml-2 shrink-0">
              {live && !reduced && (
                <span className="absolute inset-0 animate-ping rounded-lg bg-accent/60 [animation-delay:1.6s] [animation-iteration-count:3]" />
              )}
              <span
                className={`relative block rounded-lg bg-accent px-3 py-1 text-[11px] font-bold text-emerald-950 transition-transform delay-[1300ms] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none ${live ? "scale-100" : "scale-0"}`}
              >
                {t("Buy")}
              </span>
            </span>
          </div>

          {/* anomaly: the reasons fill in, biggest first */}
          <div
            className={`rounded-2xl border border-rose-200 bg-rose-50 p-3 transition-all delay-[1700ms] duration-500 dark:border-rose-900 dark:bg-rose-950/40 ${live ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <TriangleAlert className="h-3.5 w-3.5" /> {t("Unusual transaction")}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {t("Cash withdrawal · LKR 50,000 — why:")}
            </p>
            <div className="mt-1.5 space-y-1">
              {[
                [t("Amount vs usual"), 80],
                [t("Transaction type"), 50],
                [t("Day of month"), 20],
              ].map(([label, w], i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[9px] text-slate-500 dark:text-slate-400">
                    {label}
                  </span>
                  <span className="h-1 flex-1 rounded-full bg-rose-100 dark:bg-rose-950">
                    <span
                      className={`block h-1 rounded-full bg-rose-400 ${grow}`}
                      style={{ width: live ? `${w}%` : "0%", transitionDelay: `${2000 + i * 150}ms` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fades and slides its children in the first time they scroll into view. */
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, seen] = useInView(0.15);
  const reduced = useReducedMotion();
  const show = seen || reduced;
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/* One result: counts up when the strip scrolls into view. */
function Stat({ r, active }) {
  const v = useCountUp(r.to, active, 1600);
  return (
    <div className="text-center sm:border-l sm:border-white/20 sm:first:border-l-0 lg:px-4">
      <p className="font-display text-3xl font-extrabold tabular-nums md:text-4xl">
        {active ? r.show(v) : r.show(0)}
      </p>
      <p className="mt-1 text-sm text-white/80">{r.label}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, children, align = "center" }) {
  return (
    <div className={`mb-10 max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-3 text-slate-500 dark:text-slate-400">{children}</p>}
    </div>
  );
}

export default function HomePage() {
  const reduced = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [statsRef, statsSeen] = useInView(0.4);
  const [flowRef, flowProgress] = useScrollProgress();

  // the phone leans towards the cursor (wide screens with a mouse only)
  function onHeroMove(e) {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: x * 14, y: -y * 10 });
  }

  return (
    <div className="space-y-20 pb-12 md:space-y-28">
      {/* ===== Hero: light, with the app on a phone ===== */}
      <section
        className="relative pt-4 md:pt-10"
        onPointerMove={onHeroMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        {/* dotted background */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-6 bottom-0 -z-10 opacity-60 [background-image:radial-gradient(theme(colors.brand.200)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] dark:[background-image:radial-gradient(theme(colors.brand.900)_1px,transparent_1px)]"
          aria-hidden
        />
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
              <Sparkles className="h-4 w-4" /> {t("Built for rural Sri Lanka")}
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
              {t("Run your kade")}{" "}
              <span className="relative whitespace-nowrap text-brand-600 dark:text-brand-400">
                {t("smarter.")}
                <svg
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full text-accent"
                  aria-hidden
                >
                  <path
                    d="M2 9 C 50 2, 150 2, 198 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="220"
                    className="motion-safe:animate-draw"
                  />
                </svg>
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              {t(
                "One app for the small shop and agency-banking agent: record every sale, know what to restock and when, build a credit record, and keep customers' money safe — with AI that explains itself.",
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="group inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {t("Get started")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                {t("Sign in")}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2 text-sm">
              {[
                [Brain, t("Explainable AI")],
                [ShieldCheck, t("CBSL limits built in")],
                [CalendarDays, t("Avurudu-aware forecasts")],
              ].map(([Icon, label]) => (
                <li
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"
                >
                  <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {label}
                </li>
              ))}
            </ul>
          </div>
          <PhonePreview tilt={tilt} />
        </div>
      </section>

      {/* ===== Results strip ===== */}
      <section ref={statsRef} className="rounded-3xl gradient-brand px-6 py-10 text-white sm:px-10">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-white/80">
          {t("Tested on data the models never saw")}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((r) => (
            <Stat key={r.value} r={r} active={statsSeen || reduced} />
          ))}
        </div>
      </section>

      {/* ===== How it works: a timeline ===== */}
      <section>
        <SectionTitle eyebrow={t("How it works")} title={t("One ledger, connected decisions")}>
          {t(
            "What you record once feeds every insight. The demand forecast sets when to restock, and steady stock improves your credit score.",
          )}
        </SectionTitle>
        <ol ref={flowRef} className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* the line that joins the steps (wide screens) — fills as you scroll */}
          <span
            className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 rounded bg-slate-200 dark:bg-slate-800 lg:block"
            aria-hidden
          >
            <span
              className="block h-full rounded bg-gradient-to-r from-brand-400 via-brand-500 to-accent"
              style={{ width: `${flowProgress * 100}%` }}
            />
          </span>
          {flow.map((step, i) => {
            const lit = flowProgress >= i / (flow.length - 1) - 0.02;
            return (
              <li
                key={step.title}
                className={`relative flex flex-col items-center text-center transition-all duration-500 ${lit ? "opacity-100" : "opacity-40"}`}
              >
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-md ring-4 transition-all duration-500 ${
                    lit
                      ? "scale-110 bg-brand-600 text-white ring-brand-200 dark:ring-brand-900"
                      : "scale-100 bg-white text-brand-600 ring-brand-100 dark:bg-slate-900 dark:text-brand-300 dark:ring-brand-950"
                  }`}
                >
                  <step.icon className="h-6 w-6" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-emerald-950">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-[16rem] text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ===== Modules: 2 × 2 ===== */}
      <section>
        <SectionTitle eyebrow={t("Modules")} title={t("Four modules, one shop")} />
        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((m, i) => (
            <Reveal key={m.title} delay={i * 120}>
              <div className="group flex h-full gap-5 rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-950 dark:text-brand-300">
                  <m.icon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.desc}</p>
                  <p className="mt-3 flex gap-2 border-l-4 border-accent pl-3 text-sm text-slate-700 dark:text-slate-200">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" /> {m.ai}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Trust ===== */}
      <section className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <SectionTitle eyebrow={t("Why you can trust it")} title={t("AI you can check")} align="left" />
        <div className="space-y-4">
          {trust.map((item, i) => (
            <Reveal key={item.title} delay={i * 120}>
              <div className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-slate-800 dark:text-brand-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-center text-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 sm:px-10">
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-5">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            {t("Ready to run your kade")} <span className="text-accent">{t("smarter?")}</span>
          </h2>
          <p className="max-w-lg text-slate-300">
            {t("Create an account and start recording your sales today.")}
          </p>
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-emerald-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-accent-dark hover:text-white"
          >
            {t("Get started")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
