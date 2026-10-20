// Every report in the Reports Center. Each `load({ from, to }, tr)` returns one report model that
// the page, the PDF and the Excel file all render the same way:
// { kpis: [{ label, value, tone? }], sections: [{ heading, columns, rows, totals? }] }
// `tr` translates the labels: t for the screen and Excel, English (identity) for the PDF,
// because the PDF fonts can't draw Sinhala.
// columns: [{ key, label, type?: "money" | "number" | "date" | "text", align? }]
import { transactionApi } from "@/services/api/transaction";
import { inventoryApi } from "@/services/api/inventory";
import { procurementApi } from "@/services/api/procurement";
import { supplierApi } from "@/services/api/supplier";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { titleCase } from "@/lib/formatters";
import { t } from "@/lib/i18n";

const num = (v) => Number(v) || 0;
const list = (d) => (Array.isArray(d) ? d : []);
const words = (v) => titleCase(String(v || "").replace(/_/g, " "));

// "YYYY-MM-DD" of a timestamp in the browser's timezone
const dayOf = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const inRange = (v, { from, to }) => {
  const d = dayOf(v);
  return (!from || d >= from) && (!to || d <= to);
};

// journal + P&L for the range are shared by four reports — fetch once per range
let journalCache = { key: null, promise: null };
function loadJournal({ from, to }) {
  const key = `${from}|${to}`;
  if (journalCache.key !== key) journalCache = { key, promise: transactionApi.journal({ from, to }) };
  return journalCache.promise;
}
export function clearReportCache() {
  journalCache = { key: null, promise: null };
}

const money = (key, label, extra = {}) => ({ key, label, type: "money", align: "right", ...extra });
const count = (key, label) => ({ key, label, type: "number", align: "right" });
const text = (key, label) => ({ key, label, type: "text" });
const date = (key, label) => ({ key, label, type: "date" });

export const REPORT_GROUPS = [
  {
    get label() {
      return t("Accounting");
    },
    ids: ["income", "pnl", "journal", "trial"],
  },
  {
    get label() {
      return t("Stock & purchasing");
    },
    ids: ["goods", "stock", "procurement", "suppliers"],
  },
  {
    get label() {
      return t("Money in & out");
    },
    ids: ["payments", "cashflow", "transactions", "agency"],
  },
];

export const REPORTS = {
  income: {
    icon: "📈",
    usesRange: true,
    name: "Income Statement",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Revenue, costs, and net profit.");
    },
    async load(range, tr = t) {
      const pl = (await loadJournal(range))?.profit_loss || {};
      const margin = pl.sales ? (num(pl.net_profit) / num(pl.sales)) * 100 : 0;
      return {
        kpis: [
          { label: tr("Total Revenue"), value: num(pl.sales), type: "money" },
          { label: tr("Gross Profit"), value: num(pl.gross_profit), type: "money" },
          {
            label: pl.is_profit === false ? tr("Net Loss") : tr("Net Profit"),
            value: num(pl.net_profit),
            type: "money",
            tone: num(pl.net_profit) >= 0 ? "good" : "bad",
          },
          { label: tr("Profit Margin"), value: `${margin.toFixed(1)}%` },
        ],
        sections: [
          {
            heading: tr("Income & Expense Statement"),
            columns: [text("line", tr("Description")), money("amount", tr("Amount (LKR)"))],
            rows: [
              { line: tr("Total Revenue / Sales"), amount: num(pl.sales) },
              { line: tr("Cost of Goods Sold"), amount: -num(pl.cost_of_goods) },
              { line: tr("Gross Profit"), amount: num(pl.gross_profit), _bold: true },
              ...(num(pl.other_income) ? [{ line: tr("Other income"), amount: num(pl.other_income) }] : []),
              { line: tr("Operating Expenses"), amount: -num(pl.total_expenses) },
              {
                line: pl.is_profit === false ? tr("Net Loss") : tr("Net Income / Profit"),
                amount: num(pl.net_profit),
                _bold: true,
              },
            ],
          },
        ],
      };
    },
  },

  pnl: {
    icon: "⚖️",
    usesRange: true,
    name: "Trading & Profit and Loss Account",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Sales, cost of goods and every expense account.");
    },
    async load(range, tr = t) {
      const pl = (await loadJournal(range))?.profit_loss || {};
      return {
        kpis: [
          { label: tr("Total Revenue"), value: num(pl.sales), type: "money" },
          { label: tr("Total Bought"), value: num(pl.total_purchases), type: "money" },
          { label: tr("Total Expense"), value: num(pl.total_expenses), type: "money" },
          {
            label: pl.is_profit === false ? tr("Net Loss") : tr("Net Profit"),
            value: num(pl.net_profit),
            type: "money",
            tone: num(pl.net_profit) >= 0 ? "good" : "bad",
          },
        ],
        sections: [
          {
            heading: tr("Trading Account"),
            columns: [text("line", tr("Particulars")), money("amount", tr("Amount (LKR)"))],
            rows: [
              { line: tr("Sales"), amount: num(pl.sales) },
              { line: tr("Less: Cost of Goods Sold"), amount: -num(pl.cost_of_goods) },
              { line: tr("Gross Profit"), amount: num(pl.gross_profit), _bold: true },
            ],
          },
          {
            heading: tr("Profit & Loss Account"),
            columns: [text("line", tr("Particulars")), money("amount", tr("Amount (LKR)"))],
            rows: [
              { line: tr("Gross Profit"), amount: num(pl.gross_profit) },
              ...(num(pl.other_income)
                ? [{ line: tr("Add: Other Income A/C"), amount: num(pl.other_income) }]
                : []),
              ...list(pl.expenses).map((e) => ({
                line: `${tr("Less:")} ${e.account}`,
                amount: -num(e.amount),
              })),
              {
                line: pl.is_profit === false ? tr("Net Loss") : tr("Net Profit"),
                amount: num(pl.net_profit),
                _bold: true,
              },
            ],
          },
        ],
      };
    },
  },

  journal: {
    icon: "📒",
    usesRange: true,
    name: "General Journal",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Double-entry records (Debit / Credit) for every transaction.");
    },
    async load(range, tr = t) {
      const j = (await loadJournal(range)) || {};
      const rows = list(j.entries).map((e) => ({
        date: e.date,
        particulars: e.particulars,
        type: tr(words(e.transaction_type)),
        debit: num(e.debit) || null,
        credit: num(e.credit) || null,
      }));
      return {
        kpis: [
          { label: tr("Total Debit:").replace(":", ""), value: num(j.totals?.total_debit), type: "money" },
          { label: tr("Total Credit:").replace(":", ""), value: num(j.totals?.total_credit), type: "money" },
          {
            label: tr("Status"),
            value: j.totals?.balanced ? tr("Balanced ✓") : tr("Not balanced"),
            tone: j.totals?.balanced ? "good" : "bad",
          },
        ],
        sections: [
          {
            heading: tr("General Journal"),
            columns: [
              date("date", tr("Date")),
              text("particulars", tr("Particulars")),
              text("type", tr("Type")),
              money("debit", tr("Debit")),
              money("credit", tr("Credit")),
            ],
            rows,
            totals: {
              particulars: tr("Total"),
              debit: num(j.totals?.total_debit),
              credit: num(j.totals?.total_credit),
            },
          },
        ],
      };
    },
  },

  trial: {
    icon: "🧮",
    usesRange: true,
    name: "Trial Balance",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Debit and credit totals per account — both sides must match.");
    },
    async load(range, tr = t) {
      const j = (await loadJournal(range)) || {};
      const byAccount = {};
      for (const e of list(j.entries)) {
        const a = (byAccount[e.account] ||= { account: e.account, debit: 0, credit: 0 });
        a.debit += num(e.debit);
        a.credit += num(e.credit);
      }
      // each account shows its net balance on one side, like a classic trial balance
      const rows = Object.values(byAccount)
        .map((a) => {
          const net = a.debit - a.credit;
          return { account: a.account, debit: net > 0 ? net : null, credit: net < 0 ? -net : null };
        })
        .sort((a, b) => a.account.localeCompare(b.account));
      const dr = rows.reduce((s, r) => s + num(r.debit), 0);
      const cr = rows.reduce((s, r) => s + num(r.credit), 0);
      const balanced = Math.abs(dr - cr) < 0.01;
      return {
        kpis: [
          { label: tr("Total Debit:").replace(":", ""), value: dr, type: "money" },
          { label: tr("Total Credit:").replace(":", ""), value: cr, type: "money" },
          {
            label: tr("Status"),
            value: balanced ? tr("Balanced ✓") : tr("Not balanced"),
            tone: balanced ? "good" : "bad",
          },
        ],
        sections: [
          {
            heading: tr("Trial Balance"),
            columns: [
              text("account", tr("Account")),
              money("debit", tr("Debit")),
              money("credit", tr("Credit")),
            ],
            rows,
            totals: { account: tr("Total"), debit: dr, credit: cr },
          },
        ],
      };
    },
  },

  goods: {
    icon: "📦",
    usesRange: true,
    name: "Goods Movement",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Units sold and bought per item, with their value.");
    },
    async load(range, tr = t) {
      const g = (await loadJournal(range))?.goods || {};
      const rows = list(g.items).map((i) => ({
        item: i.item,
        sold_qty: num(i.sold_qty),
        sales_value: num(i.sales_value),
        bought_qty: num(i.bought_qty),
        purchase_value: num(i.purchase_value),
        net_qty: num(i.net_qty),
      }));
      return {
        kpis: [
          { label: tr("Items"), value: rows.length, type: "number" },
          { label: tr("Total Sold"), value: num(g.total_sold_qty), type: "number" },
          { label: tr("Total Bought"), value: num(g.total_bought_qty), type: "number" },
        ],
        sections: [
          {
            heading: tr("Goods Movement"),
            columns: [
              text("item", tr("Item")),
              count("sold_qty", tr("Sold")),
              money("sales_value", tr("Sales value")),
              count("bought_qty", tr("Bought")),
              money("purchase_value", tr("Purchase value")),
              count("net_qty", tr("Net change")),
            ],
            rows,
            totals: {
              item: tr("Total"),
              sold_qty: num(g.total_sold_qty),
              sales_value: rows.reduce((s, r) => s + r.sales_value, 0),
              bought_qty: num(g.total_bought_qty),
              purchase_value: rows.reduce((s, r) => s + r.purchase_value, 0),
            },
          },
        ],
      };
    },
  },

  stock: {
    icon: "🏷️",
    usesRange: false,
    name: "Stock Report",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Current stock, its value and what needs reordering.");
    },
    async load(range, tr = t) {
      const items = list(await inventoryApi.list());
      const rows = items.map((i) => {
        const qty = num(i.quantity);
        const cost = num(i.cost_price ?? i.unit_price);
        const low = qty <= num(i.reorder_level);
        return {
          name: i.name,
          category: tr(i.category || "—"),
          quantity: qty,
          unit: tr(i.unit || ""),
          cost,
          value: qty * cost,
          reorder_level: num(i.reorder_level),
          status: low ? tr("Reorder") : tr("In stock"),
          _tone: low ? "bad" : null,
        };
      });
      const total = rows.reduce((s, r) => s + r.value, 0);
      const low = rows.filter((r) => r._tone).length;
      return {
        kpis: [
          { label: tr("Items"), value: rows.length, type: "number" },
          { label: tr("Total Stock Value"), value: total, type: "money" },
          { label: tr("Low Stock Items"), value: low, type: "number", tone: low ? "bad" : "good" },
        ],
        sections: [
          {
            heading: tr("Stock Report"),
            columns: [
              text("name", tr("Item")),
              text("category", tr("Category")),
              count("quantity", tr("Qty")),
              text("unit", tr("Unit")),
              money("cost", tr("Unit Cost")),
              money("value", tr("Stock value")),
              count("reorder_level", tr("Reorder Level")),
              text("status", tr("Status")),
            ],
            rows,
            totals: { name: tr("Total"), value: total },
          },
        ],
      };
    },
  },

  procurement: {
    icon: "🛒",
    usesRange: true,
    name: "Procurement Orders",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Purchase orders, their suppliers and status.");
    },
    async load(range, tr = t) {
      const orders = list(await procurementApi.list()).filter((o) =>
        inRange(o.date || o.order_date || o.created_at, range),
      );
      const rows = orders.map((o) => ({
        no: o.procurement_no || "—",
        date: o.date || o.order_date || o.created_at,
        supplier: o.selected_supplier_name || o.supplier_name || "—",
        items: Array.isArray(o.items) ? o.items.map((i) => i.item_name).join(", ") : o.item_name || "—",
        arrival: o.arrival_date || null,
        total: num(o.total_cost),
        status: tr(words(o.status || "pending")),
      }));
      const total = rows.reduce((s, r) => s + r.total, 0);
      return {
        kpis: [
          { label: tr("Orders"), value: rows.length, type: "number" },
          { label: tr("Total Cost"), value: total, type: "money" },
          {
            label: tr("Pending"),
            value: orders.filter((o) => (o.status || "pending") === "pending").length,
            type: "number",
          },
        ],
        sections: [
          {
            heading: tr("Procurement Orders"),
            columns: [
              text("no", tr("Order No.")),
              date("date", tr("Order Date")),
              text("supplier", tr("Supplier")),
              text("items", tr("Items")),
              date("arrival", tr("Expected Arrival")),
              money("total", tr("Total Cost")),
              text("status", tr("Status")),
            ],
            rows,
            totals: { no: tr("Total"), total },
          },
        ],
      };
    },
  },

  suppliers: {
    icon: "🤝",
    usesRange: false,
    name: "Supplier Directory",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Contacts, delivery cost and lead time of every supplier.");
    },
    async load(range, tr = t) {
      const rows = list(await supplierApi.list()).map((s) => ({
        name: s.name,
        company: s.company_name || "—",
        contact: s.contact_number || "—",
        items: Array.isArray(s.items_supplied) ? s.items_supplied.length : 0,
        delivery_cost: num(s.delivery_cost),
        lead_time: num(s.lead_time_days),
        location: s.delivery_location || "—",
      }));
      return {
        kpis: [
          { label: tr("Suppliers"), value: rows.length, type: "number" },
          {
            label: tr("Avg. delivery cost"),
            value: rows.length ? rows.reduce((s, r) => s + r.delivery_cost, 0) / rows.length : 0,
            type: "money",
          },
        ],
        sections: [
          {
            heading: tr("Supplier Directory"),
            columns: [
              text("name", tr("Supplier")),
              text("company", tr("Company")),
              text("contact", tr("Contact")),
              count("items", tr("Items")),
              money("delivery_cost", tr("Delivery Cost (LKR)")),
              count("lead_time", tr("Lead Time")),
              text("location", tr("Location")),
            ],
            rows,
          },
        ],
      };
    },
  },

  payments: {
    icon: "💵",
    usesRange: true,
    name: "Cash, Bank & Digital",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("How much came in and went out through cash, bank and digital payments.");
    },
    async load(range, tr = t) {
      const d = (await transactionApi.paymentMethods(range)) || {};
      const m = d.methods || {};
      const M = ["cash", "bank", "digital"];
      const at = (path) => Object.fromEntries(M.map((k) => [k, num(path(m[k] || {}))]));
      // one table row: the value per method + the total
      const row = (line, path, extra = {}) => {
        const v = at(path);
        return { line, ...v, total: v.cash + v.bank + v.digital, ...extra };
      };
      const credit = d.credit || {};
      const kpis = M.map((k) => ({
        label: `${tr(words(k))} — ${tr("net")}`,
        value: num(m[k]?.net),
        type: "money",
        tone: num(m[k]?.net) >= 0 ? "good" : "bad",
      }));
      kpis.push({ label: tr("Credit sales due"), value: num(credit.sales), type: "money" });

      const sales = num(d.totals?.sales);
      const share = (v) => (sales > 0 ? `${((v / sales) * 100).toFixed(1)}%` : "—");
      return {
        kpis,
        sections: [
          {
            heading: tr("Money by payment method"),
            columns: [
              text("line", tr("Description")),
              money("cash", tr("Cash")),
              money("bank", tr("Bank")),
              money("digital", tr("Digital")),
              money("total", tr("Total")),
            ],
            rows: [
              row(tr("Sales received"), (x) => x.in?.sales),
              row(tr("Other income"), (x) => x.in?.other_income),
              row(tr("Owner capital"), (x) => x.in?.capital),
              row(tr("Moved in (deposits / transfers)"), (x) => x.in?.moved_in),
              row(tr("Total money in"), (x) => x.in?.total, { _bold: true }),
              row(tr("Purchases"), (x) => -num(x.out?.purchases) || 0),
              row(tr("Expenses"), (x) => -num(x.out?.expenses) || 0),
              row(tr("Supplier payments"), (x) => -num(x.out?.supplier_payments) || 0),
              row(tr("Moved out (deposits / transfers)"), (x) => -num(x.out?.moved_out) || 0),
              row(tr("Total money out"), (x) => -num(x.out?.total) || 0, { _bold: true }),
              row(tr("Net change"), (x) => x.net, { _bold: true }),
            ],
          },
          {
            heading: tr("Sales by payment method"),
            columns: [
              text("method", tr("Payment")),
              money("amount", tr("Sales (LKR)")),
              text("share", tr("Share of sales received")),
            ],
            rows: [
              ...M.map((k) => ({
                method: tr(words(k)),
                amount: num(m[k]?.in?.sales),
                share: share(num(m[k]?.in?.sales)),
              })),
              { method: tr("Credit (not received yet)"), amount: num(credit.sales), share: "—" },
            ],
            totals: { method: tr("Total"), amount: sales + num(credit.sales) },
          },
        ],
      };
    },
  },

  cashflow: {
    icon: "🪙",
    usesRange: true,
    name: "Cash Flow",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("The shop's Cash A/C and, kept separate, the agency-banking cash and float.");
    },
    async load(range, tr = t) {
      const d = (await transactionApi.cashFlow(range)) || {};
      const shop = d.shop || {};
      const ag = d.agency || {};
      const p = ag.period || {};
      const today = ag.today || {};
      const EVENT = {
        DEPOSIT: "Customer deposit",
        WITHDRAWAL: "Customer withdrawal",
        TOPUP: "Float top-up",
        WITHDRAWAL_REVERSAL: "Withdrawal reversed",
        DEPOSIT_REVERSAL: "Deposit reversed",
      };
      const HEALTH = { HEALTHY: "Healthy", LOW_ALERT: "Low", CRITICAL_ALERT: "Critical" };
      const lines = (obj, sign) =>
        Object.entries(obj || {}).map(([k, v]) => ({ line: tr(k), amount: sign * num(v) }));
      return {
        kpis: [
          { label: tr("Opening balance"), value: num(shop.opening), type: "money" },
          { label: tr("Cash in"), value: num(shop.total_in), type: "money", tone: "good" },
          { label: tr("Cash out"), value: num(shop.total_out), type: "money", tone: "bad" },
          {
            label: tr("Cash A/C balance"),
            value: num(shop.closing),
            type: "money",
            tone: num(shop.closing) >= 0 ? "good" : "bad",
          },
          { label: tr("Agency cash on hand (now)"), value: num(today.cash_on_hand), type: "money" },
          { label: tr("Total float (all banks)"), value: num(ag.total_float), type: "money" },
        ],
        sections: [
          {
            heading: tr("Shop cash — Cash A/C"),
            columns: [text("line", tr("Description")), money("amount", tr("Amount (LKR)"))],
            rows: [
              { line: tr("Opening balance"), amount: num(shop.opening), _bold: true },
              ...lines(shop.cash_in, 1),
              ...lines(shop.cash_out, -1),
              { line: tr("Cash A/C balance"), amount: num(shop.closing), _bold: true },
            ],
          },
          {
            heading: tr("Cash A/C statement"),
            columns: [
              date("date", tr("Date")),
              text("kind", tr("Type")),
              text("note", tr("Details")),
              money("amount", tr("Amount (LKR)")),
              money("balance", tr("Balance")),
            ],
            rows: list(shop.entries).map((e) => ({ ...e, kind: tr(e.kind), note: e.note || "—" })),
          },
          {
            heading: tr("Agency banking cash (customers' money, separate from the shop)"),
            columns: [text("line", tr("Description")), money("amount", tr("Amount (LKR)"))],
            rows: [
              { line: tr("Customer deposits received"), amount: num(p.deposits) },
              { line: tr("Customer withdrawals paid out"), amount: -num(p.withdrawals) || 0 },
              { line: tr("Cash used for float top-ups"), amount: -num(p.float_topups) || 0 },
              { line: tr("Withdrawals reversed"), amount: num(p.reversals_in) },
              { line: tr("Deposits reversed"), amount: -num(p.reversals_out) || 0 },
              { line: tr("Net cash change"), amount: num(p.net), _bold: true },
              { line: tr("Cash on hand (now)"), amount: num(today.cash_on_hand), _bold: true },
              { line: tr("Available for withdrawals"), amount: num(today.available_for_withdrawals) },
              { line: tr("Available for float top-up"), amount: num(today.available_for_topup) },
            ],
          },
          {
            heading: tr("Float per partner bank"),
            columns: [
              text("bank", tr("Bank")),
              money("float", tr("Float")),
              money("available", tr("Available for deposits")),
              money("floor", tr("Floor")),
              money("ceiling", tr("Ceiling")),
              text("status", tr("Status")),
            ],
            rows: list(ag.banks).map((b) => ({
              bank: b.bank_name,
              float: num(b.float_balance),
              available: num(b.available_for_deposits),
              floor: num(b.float_floor),
              ceiling: num(b.float_ceiling),
              status: tr(HEALTH[b.health] || b.health),
              _tone: b.health === "HEALTHY" ? undefined : "bad",
            })),
            totals: { bank: tr("Total"), float: num(ag.total_float) },
          },
          {
            heading: tr("Agency banking cash statement"),
            columns: [
              date("date", tr("Date")),
              text("event", tr("Type")),
              text("customer", tr("Customer")),
              text("bank", tr("Bank")),
              money("amount", tr("Cash (LKR)")),
            ],
            rows: list(p.entries).map((e) => ({
              date: e.date,
              event: tr(EVENT[e.event] || e.event),
              customer: e.customer || "—",
              bank: e.bank || "—",
              amount: num(e.amount),
            })),
          },
        ],
      };
    },
  },

  transactions: {
    icon: "💳",
    usesRange: true,
    name: "Transactions Report",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Every sale, purchase, expense, deposit and transfer.");
    },
    async load(range, tr = t) {
      const txns = list(await transactionApi.list())
        .filter((x) => inRange(x.created_at, range))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const IN = ["sale", "deposit"];
      const rows = txns.map((x) => ({
        date: x.created_at,
        type: tr(words(x.transaction_type)),
        payment: tr(words(x.payment_method)),
        detail:
          Array.isArray(x.items) && x.items.length
            ? x.items.map((i) => `${i.item_name} × ${num(i.quantity)}`).join(", ")
            : x.category || x.description || "—",
        money_in: IN.includes(x.transaction_type) ? num(x.amount) : null,
        money_out: IN.includes(x.transaction_type) ? null : num(x.amount),
      }));
      const tin = rows.reduce((s, r) => s + num(r.money_in), 0);
      const tout = rows.reduce((s, r) => s + num(r.money_out), 0);
      return {
        kpis: [
          { label: tr("Transactions"), value: rows.length, type: "number" },
          { label: tr("Money in"), value: tin, type: "money", tone: "good" },
          { label: tr("Money out"), value: tout, type: "money", tone: "bad" },
          {
            label: tr("Net change"),
            value: tin - tout,
            type: "money",
            tone: tin - tout >= 0 ? "good" : "bad",
          },
        ],
        sections: [
          {
            heading: tr("Transactions Report"),
            columns: [
              date("date", tr("Date")),
              text("type", tr("Type")),
              text("payment", tr("Payment")),
              text("detail", tr("Details")),
              money("money_in", tr("Money in")),
              money("money_out", tr("Money out")),
            ],
            rows,
            totals: { detail: tr("Total"), money_in: tin, money_out: tout },
          },
        ],
      };
    },
  },

  agency: {
    icon: "🏦",
    usesRange: true,
    name: "Agency Banking Report",
    get title() {
      return t(this.name);
    },
    get description() {
      return t("Customer deposits, withdrawals and transfers with fees and commission.");
    },
    async load(range, tr = t) {
      const txns = list(await agencyBankingApi.list())
        .filter((x) => inRange(x.created_at, range))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const rows = txns.map((x) => ({
        date: x.created_at,
        customer: x.customer_name || "—",
        type: tr(words(x.transaction_type)),
        amount: num(x.amount),
        fee: num(x.service_fee),
        commission: num(x.commission),
        status: tr(words(x.status || "")),
      }));
      const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
      return {
        kpis: [
          { label: tr("Transactions"), value: rows.length, type: "number" },
          { label: tr("Volume"), value: sum("amount"), type: "money" },
          { label: tr("Service Fees"), value: sum("fee"), type: "money" },
          { label: tr("Commission"), value: sum("commission"), type: "money", tone: "good" },
        ],
        sections: [
          {
            heading: tr("Agency Banking Report"),
            columns: [
              date("date", tr("Date")),
              text("customer", tr("Customer")),
              text("type", tr("Type")),
              money("amount", tr("Amount (LKR)")),
              money("fee", tr("Service Fee (LKR)")),
              money("commission", tr("Commission (LKR)")),
              text("status", tr("Status")),
            ],
            rows,
            totals: {
              customer: tr("Total"),
              amount: sum("amount"),
              fee: sum("fee"),
              commission: sum("commission"),
            },
          },
        ],
      };
    },
  },
};

// Plain-text value of a cell, as the table, PDF and Excel show it
export function formatCell(value, type) {
  if (value == null || value === "") return "";
  if (type === "money") {
    const n = Number(value);
    const s = Math.abs(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${s})` : s;
  }
  if (type === "number") return Number(value).toLocaleString("en-LK", { maximumFractionDigits: 2 });
  if (type === "date") return dayOf(value);
  return String(value);
}
