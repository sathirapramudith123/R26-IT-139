"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useTransactions from "@/hooks/useTransactions";
import useInventory from "@/hooks/useInventory";
import { formatCurrency } from "@/lib/formatters";
import {
  TrendingUp, TrendingDown, Wallet, PackageX, ArrowUpRight, ArrowDownRight,
  CreditCard, Package, Handshake, ShoppingCart, Landmark, Building2, Bot, BookOpen,
} from "lucide-react";

/* Time-of-day scene selector */
function getPhase(hour) {
  if (hour >= 5 && hour < 12)  return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const PHASE = {
  morning:   { greeting: "Good morning",   sub: "A fresh start — here's your business this morning.", sky: ["#FDE68A", "#FDBA74", "#5EEAD4"] },
  afternoon: { greeting: "Good afternoon", sub: "The day's in full swing — keep it going.",            sky: ["#7DD3FC", "#38BDF8", "#22D3EE"] },
  evening:   { greeting: "Good evening",   sub: "Winding down — here's how today went.",               sky: ["#FB923C", "#F43F5E", "#7C3AED"] },
  night:     { greeting: "Good night",     sub: "Late hours — a calm look at your numbers.",           sky: ["#312E81", "#4C1D95", "#0F172A"] },
};

const STAT = {
  morning:   { income:["#0D9488","#2DD4BF"], expense:["#EA580C","#FB923C"], profit:["#059669","#34D399"], stock:["#0369A1","#38BDF8"] },
  afternoon: { income:["#0284C7","#38BDF8"], expense:["#D97706","#FBBF24"], profit:["#0891B2","#22D3EE"], stock:["#1D4ED8","#60A5FA"] },
  evening:   { income:["#E11D48","#FB7185"], expense:["#C2410C","#F97316"], profit:["#BE185D","#F472B6"], stock:["#7C3AED","#A78BFA"] },
  night:     { income:["#4F46E5","#818CF8"], expense:["#7C3AED","#A78BFA"], profit:["#0E7490","#22D3EE"], stock:["#4338CA","#6366F1"] },
};

const MODULES = [
  { href: "/dashboard/transactions",    label: "Transactions", desc: "Sales, purchases & expenses", icon: CreditCard,  tint: "teal" },
  { href: "/dashboard/journal",         label: "Journal",      desc: "Double-entry ledger",         icon: BookOpen,    tint: "indigo" },
  { href: "/dashboard/inventory",       label: "Inventory",    desc: "Stock & batches",             icon: Package,     tint: "amber" },
  { href: "/dashboard/procurement",     label: "Procurement",  desc: "Purchase orders",             icon: ShoppingCart,tint: "rose" },
  { href: "/dashboard/suppliers",       label: "Suppliers",    desc: "Your vendors",                icon: Handshake,   tint: "emerald" },
  { href: "/dashboard/agency-banking",  label: "Agency Banking", desc: "Deposits & withdrawals",    icon: Landmark,    tint: "sky" },
  { href: "/dashboard/my-banks",        label: "My Banks",     desc: "Float accounts",              icon: Building2,   tint: "violet" },
  { href: "/dashboard/predictions",     label: "Predictions",  desc: "AI insights",                 icon: Bot,         tint: "fuchsia" },
];

const TINT = {
  teal:    "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
  indigo:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  amber:   "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  rose:    "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  sky:     "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  violet:  "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400",
};

/* ── Animated sky scene with depth (parallax layers + particles) ── */
function SkyScene({ phase }) {
  const p = PHASE[phase];
  const isDay = phase === "morning" || phase === "afternoon";
  const isNight = phase === "night";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl scene">
      {/* sky gradient (base layer) */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(160deg, ${p.sky[0]}, ${p.sky[1]} 50%, ${p.sky[2]})`,
      }} />

      {/* atmospheric glow near the horizon (depth) */}
      <div className="atmo" style={{ background: `radial-gradient(120% 80% at 78% 30%, ${p.sky[0]}66, transparent 60%)` }} />

      {/* SUN */}
      {!isNight && (
        <div className={`sun sun-${phase}`}>
          <div className="sun-core" />
          <div className="sun-glow" />
          {phase !== "afternoon" && <div className="sun-rays" />}
        </div>
      )}

      {/* MOUNTAINS — morning + afternoon only */}
      {(phase === "morning" || phase === "afternoon") && (
        <div className="mountains">
          <svg viewBox="0 0 500 130" preserveAspectRatio="none" className="mtn-svg">
            <path className="mtn-far"   d="M0 130 L120 55 L210 100 L300 40 L400 95 L500 60 L500 130 Z" />
            <path className="mtn-back"  d="M0 130 L90 70 L180 110 L280 55 L380 105 L460 75 L500 110 L500 130 Z" />
            <path className="mtn-front" d="M0 130 L70 95 L160 122 L250 80 L340 118 L430 90 L500 120 L500 130 Z" />
          </svg>
        </div>
      )}

      {/* MOON + stars at night */}
      {isNight && (
        <>
          <div className="moon"><div className="moon-crater c1" /><div className="moon-crater c2" /><div className="moon-crater c3" /></div>
          {[...Array(14)].map((_, i) => <span key={i} className={`star star-${i}`} />)}
          <div className="mountains night">
            <svg viewBox="0 0 500 130" preserveAspectRatio="none" className="mtn-svg">
              <path className="mtn-nfar"  d="M0 130 L120 55 L210 100 L300 40 L400 95 L500 60 L500 130 Z" />
              <path className="mtn-nfront" d="M0 130 L70 95 L160 122 L250 80 L340 118 L430 90 L500 120 L500 130 Z" />
            </svg>
          </div>
        </>
      )}

      {/* ===== EVENING — sun setting into the sea ===== */}
      {phase === "evening" && (
        <div className="sea-scene">
          <svg viewBox="0 0 500 130" preserveAspectRatio="none" className="sea-svg">
            {/* sea water */}
            <rect x="0" y="86" width="500" height="44" className="sea-water" />
            {/* horizon line highlight */}
            <rect x="0" y="86" width="500" height="2" className="sea-horizon" />
            {/* shimmering sun reflection column on the water */}
            <path className="reflect r1" d="M232 88 Q250 130 268 88 Z" />
            <path className="reflect r2" d="M240 88 Q250 120 260 88 Z" />
            <path className="reflect r3" d="M245 88 Q250 108 255 88 Z" />
            {/* gentle wave lines */}
            <path className="wave w1" d="M0 100 q25 -5 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
            <path className="wave w2" d="M0 112 q25 -4 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
          </svg>
        </div>
      )}

      {/* CLOUDS (day) */}
      {isDay && (<><div className="cloud cloud-1" /><div className="cloud cloud-2" /><div className="cloud cloud-3" /></>)}

      {/* floating light particles (all phases — depth/atmosphere) */}
      {[...Array(6)].map((_, i) => <span key={i} className={`mote mote-${i}`} />)}

      <style jsx>{`
        .atmo { position: absolute; inset: 0; }

        /* ---------- SUN ---------- */
        .sun { position: absolute; }
        .sun-core {
          width: 62px; height: 62px; border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #fffbeb, #fde047 58%, #fbbf24);
          box-shadow: 0 0 46px 14px rgba(253,224,71,0.55);
        }
        .sun-glow { position: absolute; inset: -20px; border-radius: 9999px;
          background: radial-gradient(circle, rgba(253,224,71,0.35), transparent 70%);
          animation: pulse 3.5s ease-in-out infinite; }
        .sun-rays { position: absolute; inset: -30px; border-radius: 9999px;
          background: conic-gradient(from 0deg, transparent 0 8%, rgba(253,224,71,0.25) 9% 11%, transparent 12% 20%,
            rgba(253,224,71,0.25) 21% 23%, transparent 24% 33%, rgba(253,224,71,0.25) 34% 36%, transparent 37% 45%,
            rgba(253,224,71,0.25) 46% 48%, transparent 49% 58%, rgba(253,224,71,0.25) 59% 61%, transparent 62% 70%,
            rgba(253,224,71,0.25) 71% 73%, transparent 74% 83%, rgba(253,224,71,0.25) 84% 86%, transparent 87% 96%);
          animation: spin 40s linear infinite; }
        .sun-morning   { top: 34px; right: 74px; animation: sunrise 3s ease-out both; }
        .sun-afternoon { top: 24px; right: 96px; animation: fadein 1.2s ease both; }
        .sun-evening   { top: 40px; right: 210px; animation: seaset 3.2s ease-out both; }
        @keyframes sunrise { from { transform: translateY(96px) scale(.85); opacity: 0; } 45% { opacity: 1; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes seaset { from { transform: translateY(-30px); opacity: 0; } 35% { opacity: 1; } to { transform: translateY(46px); opacity: 1; } }
        @keyframes setdown { from { transform: translateY(-46px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadein  { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse   { 0%,100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.18); opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }

        /* ---------- MOUNTAINS (parallax depth) ---------- */
        .mountains { position: absolute; bottom: 0; left: 0; right: 0; height: 72%; }
        .mtn-svg { position: absolute; bottom: 0; width: 100%; height: 100%; }
        .mtn-far   { fill: rgba(255,255,255,0.14); animation: layerUp 1.4s ease both; }
        .mtn-back  { fill: rgba(15,118,110,0.45);  animation: layerUp 1.6s ease both; }
        .mtn-front { fill: rgba(6,78,74,0.82);      animation: layerUp 1.9s ease both; }
        .night .mtn-nfar   { fill: rgba(99,102,241,0.25); animation: layerUp 1.6s ease both; }
        .night .mtn-nfront { fill: rgba(15,23,42,0.9);    animation: layerUp 1.9s ease both; }
        @keyframes layerUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* ===== EVENING SEA ===== */
        .sea-scene { position: absolute; inset: 0; }
        .sea-svg { position: absolute; bottom: 0; width: 100%; height: 60%; }
        .sea-water   { fill: url(#seaGrad); }
        .sea-water   { fill: rgba(30,27,75,0.55); animation: fadein 1.2s ease both; }
        .sea-horizon { fill: rgba(253,224,71,0.6); animation: fadein 1.4s ease both; }
        .reflect { animation: shimmer 2.6s ease-in-out infinite; }
        .r1 { fill: rgba(251,146,60,0.45); }
        .r2 { fill: rgba(251,191,36,0.55); animation-delay: .3s; }
        .r3 { fill: rgba(253,224,71,0.7);  animation-delay: .6s; }
        @keyframes shimmer { 0%,100% { opacity: .3; transform: scaleX(1); } 50% { opacity: .85; transform: scaleX(1.25); } }
        .wave { fill: none; stroke: rgba(255,255,255,0.18); stroke-width: 1.4; }
        .w1 { animation: wavemove 6s linear infinite; }
        .w2 { animation: wavemove 8s linear infinite; opacity: .6; }
        @keyframes wavemove { from { transform: translateX(0); } to { transform: translateX(-100px); } }

        /* ---------- MOON ---------- */
        .moon { position: absolute; top: 32px; right: 74px; width: 56px; height: 56px; border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, #f8fafc, #cbd5e1 68%, #94a3b8);
          box-shadow: 0 0 34px 10px rgba(226,232,240,0.35); animation: fadein 1.4s ease both; }
        .moon-crater { position: absolute; border-radius: 9999px; background: rgba(100,116,139,0.35); }
        .c1 { width: 12px; height: 12px; top: 14px; left: 12px; }
        .c2 { width: 8px; height: 8px; top: 30px; left: 30px; }
        .c3 { width: 6px; height: 6px; top: 12px; left: 34px; }

        /* ---------- STARS ---------- */
        .star { position: absolute; width: 3px; height: 3px; border-radius: 9999px;
          background: #fff; box-shadow: 0 0 6px 1px rgba(255,255,255,0.8);
          animation: twinkle 2.4s ease-in-out infinite; }
        .star-0{top:18px;left:10%;animation-delay:0s}.star-1{top:44px;left:22%;animation-delay:.5s}
        .star-2{top:26px;left:38%;animation-delay:1s}.star-3{top:58px;left:54%;animation-delay:.3s}
        .star-4{top:16px;left:66%;animation-delay:.8s}.star-5{top:50px;left:80%;animation-delay:1.3s}
        .star-6{top:70px;left:30%;animation-delay:.6s}.star-7{top:80px;left:62%;animation-delay:1.1s}
        .star-8{top:36px;left:88%;animation-delay:.2s}.star-9{top:24px;left:16%;animation-delay:1.5s}
        .star-10{top:62px;left:44%;animation-delay:.9s}.star-11{top:14px;left:50%;animation-delay:1.7s}
        .star-12{top:48px;left:70%;animation-delay:.4s}.star-13{top:32px;left:6%;animation-delay:1.2s}
        @keyframes twinkle { 0%,100% { opacity:.25; transform: scale(.8);} 50% { opacity:1; transform: scale(1.4);} }

        /* ---------- CLOUDS (parallax) ---------- */
        .cloud { position: absolute; height: 22px; border-radius: 9999px; background: rgba(255,255,255,0.6); filter: blur(1px); }
        .cloud::before, .cloud::after { content:""; position:absolute; border-radius:9999px; background: inherit; }
        .cloud-1 { top: 30px; left:-90px; width: 74px; animation: drift 24s linear infinite; }
        .cloud-1::before{width:36px;height:36px;top:-15px;left:12px}.cloud-1::after{width:28px;height:28px;top:-9px;left:42px}
        .cloud-2 { top: 66px; left:-150px; width: 56px; opacity:.7; animation: drift 34s linear infinite; animation-delay:5s; }
        .cloud-2::before{width:28px;height:28px;top:-11px;left:10px}.cloud-2::after{width:22px;height:22px;top:-7px;left:32px}
        .cloud-3 { top: 100px; left:-200px; width: 44px; opacity:.5; animation: drift 44s linear infinite; animation-delay:10s; }
        .cloud-3::before{width:22px;height:22px;top:-8px;left:8px}.cloud-3::after{width:16px;height:16px;top:-5px;left:24px}
        @keyframes drift { from { transform: translateX(0);} to { transform: translateX(150vw);} }

        /* ---------- FLOATING MOTES (atmosphere/depth) ---------- */
        .mote { position: absolute; width: 4px; height: 4px; border-radius: 9999px;
          background: rgba(255,255,255,0.5); animation: float 9s ease-in-out infinite; }
        .mote-0{top:40%;left:15%;animation-delay:0s}.mote-1{top:60%;left:35%;animation-delay:1.5s}
        .mote-2{top:30%;left:55%;animation-delay:3s}.mote-3{top:70%;left:70%;animation-delay:2s}
        .mote-4{top:50%;left:85%;animation-delay:4s}.mote-5{top:25%;left:45%;animation-delay:.8s}
        @keyframes float { 0%,100% { transform: translateY(0); opacity:.2;} 50% { transform: translateY(-14px); opacity:.7;} }
      `}</style>
    </div>
  );
}

/* Count-up animation: eases a number from 0 to `target` over `duration` ms. */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) { setVal(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast then settles
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function DashboardPage() {
  useAuthGuard();
  const { items: txns, loading: tl, fetchAll: fetchTx } = useTransactions();
  const { items: inv, loading: il, fetchAll: fetchInv } = useInventory();
  const [phase, setPhase] = useState(() => getPhase(new Date().getHours()));
  useEffect(() => { fetchTx(); fetchInv(); }, [fetchTx, fetchInv]);
  useEffect(() => {
    const id = setInterval(() => setPhase(getPhase(new Date().getHours())), 60000);
    return () => clearInterval(id);
  }, []);

  const m = useMemo(() => {
    const income = txns.filter(t => ["sale", "deposit"].includes(t.transaction_type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = txns.filter(t => ["purchase", "expense"].includes(t.transaction_type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const lowStock = inv.filter(i => Number(i.quantity) <= Number(i.reorder_level)).length;
    return { income, expense, profit: income - expense, lowStock };
  }, [txns, inv]);

  const recent = useMemo(() =>
    [...txns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [txns]);

  // Animated (count-up) versions of the four headline numbers
  const aIncome  = useCountUp(m.income);
  const aExpense = useCountUp(m.expense);
  const aProfit  = useCountUp(m.profit);
  const aStock   = useCountUp(m.lowStock);

  const p = PHASE[phase];
  const sc = STAT[phase];
  const stats = [
    { key: "income",  label: "Total Income",    value: formatCurrency(Math.round(aIncome)),  icon: TrendingUp,   grad: sc.income },
    { key: "expense", label: "Total Expense",   value: formatCurrency(Math.round(aExpense)), icon: TrendingDown, grad: sc.expense },
    { key: "profit",  label: "Net Profit",      value: formatCurrency(Math.round(aProfit)),  icon: Wallet,       grad: sc.profit },
    { key: "stock",   label: "Low Stock Items", value: `${Math.round(aStock)}`,              icon: PackageX,     grad: sc.stock },
  ];

  if (tl || il) return <div className="page-container"><LoadingSpinner label="Loading dashboard..." /></div>;

  return (
    <div className="page-container space-y-6">
      {/* ===== Animated time-of-day hero ===== */}
      <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8" style={{ minHeight: 150 }}>
        <SkyScene phase={phase} />
        <div className="relative z-10 max-w-lg drop-shadow">
          <p className="text-sm font-semibold text-white/90">{p.greeting}</p>
          <h1 className="mt-1 font-outfit text-2xl font-bold sm:text-3xl">Here's your Lanka-Link today</h1>
          <p className="mt-2 text-sm text-white/80">{p.sub}</p>
        </div>
      </div>

      {/* ===== Stat cards ===== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` }}>
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/80">{s.label}</p>
                  <p className="mt-1.5 font-outfit text-2xl font-bold leading-tight break-words">{s.value}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Modules</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINT[mod.tint]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{mod.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{mod.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Recent activity</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            {recent.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((t, i) => {
                  const isIncome = ["sale", "deposit"].includes(t.transaction_type);
                  return (
                    <li key={t.id || i} className="flex items-center gap-3 p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isIncome ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"}`}>
                        {isIncome ? <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  : <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-200">
                          {String(t.transaction_type || "").replace(/_/g, " ")}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {t.category || t.payment_method || "—"} · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/dashboard/transactions"
              className="block border-t border-slate-100 p-3 text-center text-xs font-semibold text-teal-600 hover:bg-slate-50 dark:border-slate-800 dark:text-teal-400 dark:hover:bg-slate-800">
              View all transactions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}