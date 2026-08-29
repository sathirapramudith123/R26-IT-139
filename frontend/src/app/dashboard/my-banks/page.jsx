"use client";

import { useEffect, useState } from "react";
import { agentBankApi } from "@/services/api/agentBank";
import { formatCurrency } from "@/lib/formatters";
import {
  Landmark, Plus, TrendingUp, AlertCircle, Loader2, X,
  ArrowUpCircle, ShieldCheck, ShieldAlert, ShieldX,
} from "lucide-react";

const RISK_TIERS = [
  { value: "LOW",    label: "Low volume / rural" },
  { value: "MEDIUM", label: "Medium volume" },
  { value: "HIGH",   label: "High volume / urban" },
];

const HEALTH = {
  HEALTHY:        { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: ShieldCheck,  label: "Healthy" },
  LOW_ALERT:      { color: "text-amber-400",   bg: "bg-amber-500/10",   icon: ShieldAlert,  label: "Low float" },
  CRITICAL_ALERT: { color: "text-red-400",     bg: "bg-red-500/10",     icon: ShieldX,      label: "Critical" },
};

export default function MyBanksPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [topupBank, setTopupBank] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await agentBankApi.list();
      setBanks(Array.isArray(d) ? d : []);
    } catch {
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const totalFloat = banks.reduce((s, b) => s + Number(b.float_balance || 0), 0);
  const totalCash = banks.reduce((s, b) => s + Number(b.cash_on_hand || 0), 0);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-slate-900 dark:text-slate-100">My Banks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Float / settlement accounts for your agency banking operations.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-500 transition-all">
          <Plus className="h-4 w-4" /> Add Bank
        </button>
      </div>

      {/* Totals */}
      {banks.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500">Total Float</p>
            <p className="mt-1 font-outfit text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(totalFloat)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500">Total Cash on Hand</p>
            <p className="mt-1 font-outfit text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totalCash)}</p>
          </div>
        </div>
      )}

      {/* Bank list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : banks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <Landmark className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">No banks yet. Add your first float account to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {banks.map((b) => {
            const h = HEALTH[b.float_health] || HEALTH.HEALTHY;
            const HIcon = h.icon;
            const util = Number(b.utilization_pct || 0);
            const barPct = Math.min(100, util);   // vs floor (100% = at floor)
            return (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950">
                      <Landmark className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{b.bank_name}</h3>
                      <p className="text-xs text-slate-500">{b.risk_tier} risk tier</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${h.bg} ${h.color}`}>
                    <HIcon className="h-3.5 w-3.5" /> {h.label}
                  </span>
                </div>

                {/* Float + cash */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
                    <p className="text-[11px] text-slate-500">Float balance</p>
                    <p className="font-outfit text-lg font-bold text-teal-600 dark:text-teal-400">{formatCurrency(b.float_balance)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
                    <p className="text-[11px] text-slate-500">Cash on hand</p>
                    <p className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(b.cash_on_hand)}</p>
                  </div>
                </div>

                {/* Utilization bar (float vs floor) */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Float vs floor ({formatCurrency(b.float_floor)})</span>
                    <span className="font-semibold">{util}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${util <= 20 ? "bg-red-500" : util <= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>Floor: {formatCurrency(b.float_floor)}</span>
                    <span>Ceiling: {formatCurrency(b.float_ceiling)}</span>
                  </div>
                </div>

                <button onClick={() => setTopupBank(b)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-400 transition-all">
                  <ArrowUpCircle className="h-4 w-4" /> Top up float
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddBankModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {topupBank && <TopupModal bank={topupBank} onClose={() => setTopupBank(null)} onSaved={() => { setTopupBank(null); load(); }} />}
    </div>
  );
}

/* ---------------------------------- Add Bank ---------------------------------- */
function AddBankModal({ onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({
    bank_name: "", risk_tier: "LOW",
    float_balance: "", cash_on_hand: "",
    float_floor: "50000", float_ceiling: "500000",
  });
  const set = (k, val) => setF((p) => ({ ...p, [k]: val }));

  async function submit() {
    if (!f.bank_name.trim()) { setErr("Bank name is required."); return; }
    setSaving(true); setErr(null);
    try {
      await agentBankApi.create({
        bank_name: f.bank_name.trim(),
        risk_tier: f.risk_tier,
        float_balance: Number(f.float_balance) || 0,
        cash_on_hand: Number(f.cash_on_hand) || 0,
        float_floor: Number(f.float_floor) || 50000,
        float_ceiling: Number(f.float_ceiling) || 500000,
      });
      onSaved();
    } catch (e) {
      setErr(e.message || "Failed to add bank.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <Modal title="Add Bank" onClose={onClose}>
      {err && <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40"><AlertCircle className="h-4 w-4" />{err}</div>}
      <div className="space-y-3">
        <div>
          <label className={lbl}>Bank Name</label>
          <input className={inp} value={f.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="e.g. Bank of Ceylon" />
        </div>
        <div>
          <label className={lbl}>Risk Tier</label>
          <select className={inp} value={f.risk_tier} onChange={(e) => set("risk_tier", e.target.value)}>
            {RISK_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Opening Float</label><input type="number" className={inp} value={f.float_balance} onChange={(e) => set("float_balance", e.target.value)} placeholder="100000" /></div>
          <div><label className={lbl}>Cash on Hand</label><input type="number" className={inp} value={f.cash_on_hand} onChange={(e) => set("cash_on_hand", e.target.value)} placeholder="50000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Float Floor</label><input type="number" className={inp} value={f.float_floor} onChange={(e) => set("float_floor", e.target.value)} /></div>
          <div><label className={lbl}>Float Ceiling</label><input type="number" className={inp} value={f.float_ceiling} onChange={(e) => set("float_ceiling", e.target.value)} /></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Bank
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Top-up ---------------------------------- */
function TopupModal({ bank, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    setSaving(true); setErr(null);
    try {
      await agentBankApi.topup(bank.id, amt);
      onSaved();
    } catch (e) {
      setErr(e.message || "Top-up failed.");
    } finally {
      setSaving(false);
    }
  }

  const newFloat = Number(bank.float_balance) + (Number(amount) || 0);

  return (
    <Modal title={`Top up — ${bank.bank_name}`} onClose={onClose}>
      {err && <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40"><AlertCircle className="h-4 w-4" />{err}</div>}
      <p className="text-sm text-slate-500">Move physical cash into this float account (DR Float / CR Cash-on-Hand).</p>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/40">
        <div className="flex justify-between"><span className="text-slate-500">Current float</span><span className="font-semibold">{formatCurrency(bank.float_balance)}</span></div>
        {Number(amount) > 0 && (
          <div className="mt-1 flex justify-between"><span className="text-slate-500">After top-up</span><span className="font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(newFloat)}</span></div>
        )}
      </div>
      <div className="mt-3">
        <label className="text-xs font-medium text-slate-500">Top-up Amount (LKR)</label>
        <input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Top up
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Modal shell ---------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}