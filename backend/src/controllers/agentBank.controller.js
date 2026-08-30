import { supabase } from "../config/supabase.js";
import { toClient } from "../utils/mappers.js";
import { topUpFloat, floatHealth, getBank, getCashPool } from "../utils/float.js";

const TABLE = "agent_banks";
const ID = "agent_bank_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));
const upTier = (v) => {
  const t = String(v || "LOW").toUpperCase();
  return ["LOW", "MEDIUM", "HIGH"].includes(t) ? t : "LOW";
};

const toDb = (b) => ({
  bank_name:      b.bank_name,
  bank_code:      b.bank_code || null,
  risk_tier:      upTier(b.risk_tier),
  float_balance:  num(b.float_balance),
  float_floor:    num(b.float_floor) || 50000,
  float_ceiling:  num(b.float_ceiling) || 500000,
  alert_low_pct:  num(b.alert_low_pct) || 40,
  alert_crit_pct: num(b.alert_crit_pct) || 20,
  is_active:      b.is_active === undefined ? true : Boolean(b.is_active),
});

// health + utilization එක්ක client shape
const shape = (row) => {
  const c = toClient(row, ID);
  c.float_health = floatHealth(row);
  c.utilization_pct = num(row.float_floor) > 0
    ? +((num(row.float_balance) / num(row.float_floor)) * 100).toFixed(1)
    : null;
  return c;
};

export const getAll = async (req, res, next) => {
  try {
    const [{ data, error }, pool] = await Promise.all([
      supabase.from(TABLE).select("*").eq("user_id", req.user.id)
        .order("created_at", { ascending: false }),
      getCashPool(req.user.id),
    ]);
    if (error) throw error;
    res.json({
      cash_pool: {
        cash_on_hand: Number(pool.cash_on_hand),
        reserve_floor: Number(pool.reserve_floor),
        available_for_topup: Math.max(0, Number(pool.cash_on_hand) - Number(pool.reserve_floor)),
      },
      banks: (data || []).map(shape),
    });
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Bank not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) {
      if (error.code === "23505") return res.status(400).json({ error: "A bank with this name already exists." });
      throw error;
    }
    res.status(201).json(shape(data));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Bank not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Bank deleted" });
  } catch (e) { next(e); }
};

// POST /agent-banks/:id/topup  { amount }
// Agent physical cash -> float account (DR Float / CR Cash-on-Hand)
export const topup = async (req, res, next) => {
  try {
    const amount = num(req.body.amount);
    if (amount <= 0) return res.status(400).json({ error: "Enter a top-up amount greater than 0." });

    const bank = await getBank(req.user.id, req.params.id);
    if (!bank) return res.status(404).json({ error: "Bank not found" });
    const pool = await getCashPool(req.user.id);

    const result = await topUpFloat(req.user.id, bank, pool, amount);
    if (result.block) return res.status(400).json({ error: result.reason });

    const updated = await getBank(req.user.id, req.params.id);
    res.json({ ...shape(updated), topped_up: amount,
               float_after: result.floatAfter, cash_after: result.cashAfter });
  } catch (e) { next(e); }
};

// GET /agent-banks/:id/ledger
// Float account statement — credit/debit history + bank-wise totals.
export const ledger = async (req, res, next) => {
  try {
    const bank = await getBank(req.user.id, req.params.id);
    if (!bank) return res.status(404).json({ error: "Bank not found" });

    const { data, error } = await supabase
      .from("agent_float_ledger")
      .select("*")
      .eq("agent_bank_id", req.params.id)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    // Agent Float leg only. Float effect derived from event type:
    //   DEPOSIT -> float DOWN (out) | WITHDRAWAL/TOPUP -> float UP (in)
    let totalIn = 0, totalOut = 0;
    const rows = (data || [])
      .filter((r) => r.gl_account === "Agent Float")
      .map((r) => {
        const inflow = r.event_type === "WITHDRAWAL" || r.event_type === "TOPUP";
        const amt = Number(r.amount);
        if (inflow) totalIn += amt; else totalOut += amt;
        return {
          id: r.ledger_id, date: r.created_at, event_type: r.event_type,
          flow: inflow ? "in" : "out", amount: amt,
          balance_after: r.float_after != null ? Number(r.float_after) : null,
          note: r.note || null,
        };
      });

    res.json({
      bank: { id: bank.agent_bank_id, bank_name: bank.bank_name,
              float_balance: Number(bank.float_balance) },
      summary: {
        total_credit: totalIn,     // float increases (withdrawals + top-ups)
        total_debit: totalOut,     // float decreases (deposits)
        net: totalIn - totalOut,
        entry_count: rows.length,
      },
      entries: rows,
    });
  } catch (e) { next(e); }
};

// GET /agent-banks/summary
// Bank-wise summary — each bank's float + credit/debit totals + the global cash pool.
export const summary = async (req, res, next) => {
  try {
    const [{ data: banks, error }, { data: ledgerRows }, pool] = await Promise.all([
      supabase.from(TABLE).select("*").eq("user_id", req.user.id),
      supabase.from("agent_float_ledger").select("agent_bank_id, event_type, amount, gl_account")
        .eq("user_id", req.user.id).eq("gl_account", "Agent Float"),
      getCashPool(req.user.id),
    ]);
    if (error) throw error;

    const byBank = {};
    for (const r of ledgerRows || []) {
      const b = (byBank[r.agent_bank_id] ||= { credit: 0, debit: 0 });
      const inflow = r.event_type === "WITHDRAWAL" || r.event_type === "TOPUP";
      if (inflow) b.credit += Number(r.amount); else b.debit += Number(r.amount);
    }

    const rows = (banks || []).map((b) => {
      const t = byBank[b.agent_bank_id] || { credit: 0, debit: 0 };
      return {
        id: b.agent_bank_id, bank_name: b.bank_name, risk_tier: b.risk_tier,
        float_balance: Number(b.float_balance),
        float_health: floatHealth(b),
        total_credit: t.credit, total_debit: t.debit, net: t.credit - t.debit,
      };
    });

    res.json({
      cash_pool: {
        cash_on_hand: Number(pool.cash_on_hand),
        reserve_floor: Number(pool.reserve_floor),
        available_for_topup: Math.max(0, Number(pool.cash_on_hand) - Number(pool.reserve_floor)),
      },
      total_float: rows.reduce((s, r) => s + r.float_balance, 0),
      banks: rows,
    });
  } catch (e) { next(e); }
};