// Request-body validation (Joi) for every route that writes data.
// Written to accept exactly what the web and mobile forms send today
// (lowercase enum values, name/item_name aliases, numbers as strings, "" for empty
// optional fields). The DB CHECK constraints in schema.sql stay as the second line
// of defence.
import Joi from "joi";

const MAX_MONEY = 1e10;
const money    = Joi.number().min(0).max(MAX_MONEY);
const positive = Joi.number().greater(0).max(MAX_MONEY);
const qty      = Joi.number().greater(0).max(1e7);
const optStr   = (n) => Joi.string().trim().max(n).allow("", null);
const optNum   = (s) => s.allow(null, "");
const oneOf    = (...v) => Joi.string().trim().insensitive().valid(...v)
                   .messages({ "any.only": `{#label} must be one of: ${v.join(", ")}`,
                               "string.empty": `{#label} must be one of: ${v.join(", ")}` });
const dateStr  = Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}/).allow("", null)
                   .messages({ "string.pattern.base": "{#label} must be a date (YYYY-MM-DD)" });
// 7–15 digits, with optional + / spaces / dashes / brackets (0771234567, +94 77 123 4567)
const phone    = Joi.string().trim().max(20)
                   .custom((v, h) => (/^[0-9+\-\s()]+$/.test(v) && /^\d{7,15}$/.test(v.replace(/\D/g, ""))
                     ? v : h.error("phone.invalid")))
                   .messages({ "phone.invalid": "{#label} must be a valid phone number" });
const nameRequired = (msg) => (v, h) =>
  String(v.name || v.item_name || v.supplier_name || "").trim() ? v : h.message({ custom: msg });

// ── Transactions ───────────────────────────────────────────────
export const transaction = Joi.object({
  transaction_type: oneOf("sale", "purchase", "expense", "deposit", "transfer").required(),
  payment_method:   oneOf("cash", "bank", "digital").required(),
  amount:           positive.required(),
  category:         optStr(100),
  description:      optStr(1000),
  item_name:        optStr(150),
  quantity:         optNum(qty),
  items: Joi.array().max(200).allow(null).items(Joi.object({
    item_name:  Joi.string().trim().min(1).max(150).required(),
    quantity:   qty.required(),
    unit_price: optNum(money),
    cost_price: optNum(money),
    amount:     optNum(money),
  }).unknown(true)),
});

// ── Inventory ──────────────────────────────────────────────────
export const inventory = Joi.object({
  name: optStr(150), item_name: optStr(150),
  quantity:       Joi.number().min(0).max(1e7).required(),
  reorder_level:  optNum(Joi.number().min(0).max(1e7)),
  cost_price:     optNum(money),
  unit_price:     optNum(money),
  unit:           oneOf("kg", "g", "l", "ml", "unit", "box", "carton").allow("", null),
  lead_time_days: optNum(Joi.number().integer().min(0).max(365)),
  category: optStr(100), supplier_name: optStr(150),
}).custom(nameRequired("Item name is required"));

// ── Suppliers ──────────────────────────────────────────────────
export const supplier = Joi.object({
  name: optStr(150), supplier_name: optStr(150), company_name: optStr(150),
  contact_number:     phone.required(),
  email:              Joi.string().trim().email({ tlds: false }).max(255).allow("", null),
  delivery_location:  optStr(500),
  delivery_cost:      optNum(money),
  available_quantity: optNum(Joi.number().min(0).max(1e9)),
  lead_time_days:     optNum(Joi.number().integer().min(0).max(365)),
  latitude:           optNum(Joi.number().min(-90).max(90)),
  longitude:          optNum(Joi.number().min(-180).max(180)),
  items_supplied: Joi.array().max(500).allow(null).items(Joi.alternatives(
    Joi.string().trim().max(150),                              // legacy ["Rice", ...]
    Joi.object({
      item_name:  Joi.string().trim().max(150).required(),
      quantity:   optNum(Joi.number().min(0)),
      unit_price: optNum(money),
    }).unknown(true),
  )),
}).custom(nameRequired("Supplier name is required"));

// ── Procurement ────────────────────────────────────────────────
const procurementStatus = oneOf("pending", "ordered", "received", "cancelled").allow("", null);
export const procurement = Joi.object({
  item_name: optStr(150),
  quantity:  optNum(qty),
  items: Joi.array().max(200).allow(null).items(Joi.object({
    item_name: Joi.string().trim().min(1).max(150).required(),
    quantity:  qty.required(),
    unit_cost:  optNum(money),
    cost_price: optNum(money),
  }).unknown(true)),
  total_cost:             optNum(money),
  expected_selling_price: optNum(money),
  estimated_profit:       optNum(Joi.number().min(-MAX_MONEY).max(MAX_MONEY)),   // can be negative
  status:             procurementStatus,
  procurement_status: procurementStatus,
  date: dateStr, order_date: dateStr, arrival_date: dateStr,
  delivery_location: optStr(500),
  special_note:      optStr(1000),
});

// ── Agency banking ─────────────────────────────────────────────
const bankingStatus = oneOf("completed", "pending", "failed").allow("", null);
export const agencyBanking = Joi.object({
  customer_name:    Joi.string().trim().min(1).max(150).required(),
  customer_phone:   phone.required(),
  customer_nic:     Joi.string().trim().max(20).pattern(/^[0-9A-Za-z]*$/).allow("", null)
                      .messages({ "string.pattern.base": "customer_nic may contain only letters and digits" }),
  account_number:   Joi.string().trim().min(1).max(30).required(),
  source_of_funds:  optStr(150),
  transaction_type: oneOf("cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry").required(),
  amount:           positive.required(),
  service_fee:      optNum(money),
  commission:       optNum(money),
  agent_bank_id:    Joi.string().trim().guid().allow("", null),
  channel:          optStr(50),
  tx_hour:          optNum(Joi.number().integer().min(0).max(23)),
  created_offline:  Joi.boolean(),
  status:           bankingStatus,
  banking_status:   bankingStatus,
});

// ── Agent banks ────────────────────────────────────────────────
const floorBelowCeiling = (v, h) => {
  const f = v.float_floor, c = v.float_ceiling;
  const set = (x) => x != null && x !== "" && Number(x) > 0;   // 0/empty -> controller default
  return set(f) && set(c) && Number(f) > Number(c)
    ? h.message({ custom: "Float floor cannot be higher than the float ceiling" })
    : v;
};
const bankFields = {
  bank_name:      Joi.string().trim().min(1).max(100),
  bank_code:      optStr(20),
  risk_tier:      oneOf("low", "medium", "high").allow("", null),
  float_floor:    optNum(money),
  float_ceiling:  optNum(money),
  alert_low_pct:  optNum(Joi.number().min(0).max(100)),
  alert_crit_pct: optNum(Joi.number().min(0).max(100)),
  is_active:      Joi.boolean(),
};
export const agentBankCreate = Joi.object({
  ...bankFields,
  bank_name:     bankFields.bank_name.required(),
  float_balance: optNum(money),
  cash_on_hand:  optNum(money),
}).custom(floorBelowCeiling);
export const agentBankUpdate = Joi.object(bankFields).custom(floorBelowCeiling);
export const amountOnly = Joi.object({ amount: positive.required() });

// ── Auth ───────────────────────────────────────────────────────
// Login / forgot-password only check that the fields are there: an account saved
// earlier with an unusual email must still be able to sign in.
// Emails are not lower-cased, because existing accounts are matched exactly.
const anyEmail = Joi.string().trim().min(1).max(255);
export const register = Joi.object({
  fullName: optStr(150), full_name: optStr(150),
  email:    Joi.string().trim().email({ tlds: false }).max(255).required(),
  password: Joi.string().min(6).max(128).required(),
}).custom((v, h) => (String(v.fullName || v.full_name || "").trim() ? v : h.message({ custom: "Full name is required" })));
export const login          = Joi.object({ email: anyEmail.required(), password: Joi.string().max(200).required() });
export const forgotPassword = Joi.object({ email: anyEmail.required() });
export const resetPassword  = Joi.object({
  token:    Joi.string().trim().hex().length(64).required()
              .messages({ "string.hex": "Invalid or expired reset token", "string.length": "Invalid or expired reset token" }),
  password: Joi.string().min(6).max(128).required(),
});
