// Every report in the Reports Center (same reports as the web app's lib/reports/definitions.js).
// Each load(range, tr) returns one ReportModel that the screen, the PDF and the Excel file all
// render the same way. `tr` translates the labels: tr() on screen / in Excel, English for the PDF,
// because the PDF fonts can't draw Sinhala.
import '../core/api.dart';
import '../core/i18n.dart';

typedef Translate = String Function(String);
String english(String s) => s;

enum ColType { text, money, number, date }

class ReportColumn {
  final String key;
  final String label;
  final ColType type;
  const ReportColumn(this.key, this.label, [this.type = ColType.text]);
  bool get right => type == ColType.money || type == ColType.number;
}

class Kpi {
  final String label;
  final Object value; // num or String
  final ColType type;
  final String? tone; // good | bad
  const Kpi(this.label, this.value, {this.type = ColType.number, this.tone});
}

class ReportSection {
  final String heading;
  final List<ReportColumn> columns;
  final List<Map<String, dynamic>> rows; // optional "_bold" / "_bad" flags per row
  final Map<String, dynamic>? totals;
  const ReportSection(this.heading, this.columns, this.rows, [this.totals]);
}

class ReportModel {
  final List<Kpi> kpis;
  final List<ReportSection> sections;
  const ReportModel(this.kpis, this.sections);
}

class DateRange2 {
  final DateTime from;
  final DateTime to;
  const DateRange2(this.from, this.to);
}

String ymd(DateTime d) =>
    "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";

double _n(dynamic v) => v is num ? v.toDouble() : double.tryParse("${v ?? ""}") ?? 0;
List<Map<String, dynamic>> _list(dynamic d) =>
    d is List ? d.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
String _words(dynamic v) => "${v ?? ""}"
    .replaceAll("_", " ")
    .split(" ")
    .where((w) => w.isNotEmpty)
    .map((w) => w[0].toUpperCase() + w.substring(1))
    .join(" ");

// local calendar day of an ISO timestamp
String dayOf(dynamic v) {
  final d = DateTime.tryParse("${v ?? ""}");
  return d == null ? "" : ymd(d.toLocal());
}

bool _inRange(dynamic v, DateRange2 r) {
  final d = dayOf(v);
  return d.isNotEmpty && d.compareTo(ymd(r.from)) >= 0 && d.compareTo(ymd(r.to)) <= 0;
}

// journal + P&L for a range are shared by four reports — fetch once per range
String? _journalKey;
Future<dynamic>? _journalFuture;
Future<Map<String, dynamic>> _journal(DateRange2 r) async {
  final key = "${ymd(r.from)}|${ymd(r.to)}";
  if (_journalKey != key) {
    _journalKey = key;
    _journalFuture = Api.get("/transactions/journal?from=${ymd(r.from)}&to=${ymd(r.to)}");
  }
  final d = await _journalFuture;
  return d is Map ? Map<String, dynamic>.from(d) : {};
}

void clearReportCache() => _journalKey = null;

// Plain-text value of a cell, as the table and PDF show it
String formatCell(dynamic v, ColType type) {
  if (v == null || "$v".isEmpty) return "";
  switch (type) {
    case ColType.money:
      final n = _n(v);
      final s = n.abs().toStringAsFixed(2);
      final parts = s.split(".");
      final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ",");
      return n < 0 ? "($whole.${parts[1]})" : "$whole.${parts[1]}";
    case ColType.number:
      final n = _n(v);
      return n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    case ColType.date:
      return dayOf(v).isEmpty ? "$v" : dayOf(v);
    case ColType.text:
      return "$v";
  }
}

class ReportDef {
  final String id;
  final String icon;
  final String name; // English — used for the PDF and file names
  final String description;
  final bool usesRange;
  final Future<ReportModel> Function(DateRange2 range, Translate tr) load;
  const ReportDef(this.id, this.icon, this.name, this.description, this.usesRange, this.load);
  String get title => tr(name);
}

class ReportGroup {
  final String name;
  final List<String> ids;
  const ReportGroup(this.name, this.ids);
}

const reportGroups = [
  ReportGroup("Accounting", ["income", "pnl", "journal", "trial"]),
  ReportGroup("Stock & purchasing", ["goods", "stock", "procurement", "suppliers"]),
  ReportGroup("Money in & out", ["transactions", "agency"]),
];

ReportColumn _money(String k, String l) => ReportColumn(k, l, ColType.money);
ReportColumn _count(String k, String l) => ReportColumn(k, l, ColType.number);
ReportColumn _text(String k, String l) => ReportColumn(k, l);
ReportColumn _date(String k, String l) => ReportColumn(k, l, ColType.date);

Kpi _netKpi(Map pl, Translate tr) => Kpi(
  pl["is_profit"] == false ? tr("Net Loss") : tr("Net Profit"),
  _n(pl["net_profit"]),
  type: ColType.money,
  tone: _n(pl["net_profit"]) >= 0 ? "good" : "bad",
);

final Map<String, ReportDef> reports = {
  "income": ReportDef("income", "📈", "Income Statement", "Revenue, costs, and net profit.", true, (
    r,
    tr,
  ) async {
    final pl = Map<String, dynamic>.from((await _journal(r))["profit_loss"] ?? {});
    final sales = _n(pl["sales"]);
    final margin = sales != 0 ? _n(pl["net_profit"]) / sales * 100 : 0;
    return ReportModel(
      [
        Kpi(tr("Total Revenue"), sales, type: ColType.money),
        Kpi(tr("Gross Profit"), _n(pl["gross_profit"]), type: ColType.money),
        _netKpi(pl, tr),
        Kpi(tr("Profit Margin"), "${margin.toStringAsFixed(1)}%"),
      ],
      [
        ReportSection(
          tr("Income & Expense Statement"),
          [_text("line", tr("Description")), _money("amount", tr("Amount (LKR)"))],
          [
            {"line": tr("Total Revenue / Sales"), "amount": sales},
            {"line": tr("Cost of Goods Sold"), "amount": -_n(pl["cost_of_goods"])},
            {"line": tr("Gross Profit"), "amount": _n(pl["gross_profit"]), "_bold": true},
            {"line": tr("Operating Expenses"), "amount": -_n(pl["total_expenses"])},
            {
              "line": pl["is_profit"] == false ? tr("Net Loss") : tr("Net Income / Profit"),
              "amount": _n(pl["net_profit"]),
              "_bold": true,
            },
          ],
        ),
      ],
    );
  }),

  "pnl": ReportDef(
    "pnl",
    "⚖️",
    "Trading & Profit and Loss Account",
    "Sales, cost of goods and every expense account.",
    true,
    (r, tr) async {
      final pl = Map<String, dynamic>.from((await _journal(r))["profit_loss"] ?? {});
      return ReportModel(
        [
          Kpi(tr("Total Revenue"), _n(pl["sales"]), type: ColType.money),
          Kpi(tr("Total Bought"), _n(pl["total_purchases"]), type: ColType.money),
          Kpi(tr("Total Expense"), _n(pl["total_expenses"]), type: ColType.money),
          _netKpi(pl, tr),
        ],
        [
          ReportSection(
            tr("Trading Account"),
            [_text("line", tr("Particulars")), _money("amount", tr("Amount (LKR)"))],
            [
              {"line": tr("Sales"), "amount": _n(pl["sales"])},
              {"line": tr("Less: Cost of Goods Sold"), "amount": -_n(pl["cost_of_goods"])},
              {"line": tr("Gross Profit"), "amount": _n(pl["gross_profit"]), "_bold": true},
            ],
          ),
          ReportSection(
            tr("Profit & Loss Account"),
            [_text("line", tr("Particulars")), _money("amount", tr("Amount (LKR)"))],
            [
              {"line": tr("Gross Profit"), "amount": _n(pl["gross_profit"])},
              for (final e in _list(pl["expenses"]))
                {"line": "${tr("Less:")} ${e["account"]}", "amount": -_n(e["amount"])},
              {
                "line": pl["is_profit"] == false ? tr("Net Loss") : tr("Net Profit"),
                "amount": _n(pl["net_profit"]),
                "_bold": true,
              },
            ],
          ),
        ],
      );
    },
  ),

  "journal": ReportDef(
    "journal",
    "📒",
    "General Journal",
    "Double-entry records (Debit / Credit) for every transaction.",
    true,
    (r, tr) async {
      final j = await _journal(r);
      final totals = Map<String, dynamic>.from(j["totals"] ?? {});
      final balanced = totals["balanced"] == true;
      return ReportModel(
        [
          Kpi(tr("Total Debit"), _n(totals["total_debit"]), type: ColType.money),
          Kpi(tr("Total Credit"), _n(totals["total_credit"]), type: ColType.money),
          Kpi(
            tr("Status"),
            balanced ? tr("Balanced ✓") : tr("Not balanced"),
            tone: balanced ? "good" : "bad",
          ),
        ],
        [
          ReportSection(
            tr("General Journal"),
            [
              _date("date", tr("Date")),
              _text("particulars", tr("Particulars")),
              _text("type", tr("Type")),
              _money("debit", tr("Debit")),
              _money("credit", tr("Credit")),
            ],
            [
              for (final e in _list(j["entries"]))
                {
                  "date": e["date"],
                  "particulars": "${e["particulars"] ?? ""}".trim(),
                  "type": tr(_words(e["transaction_type"])),
                  "debit": _n(e["debit"]) == 0 ? null : _n(e["debit"]),
                  "credit": _n(e["credit"]) == 0 ? null : _n(e["credit"]),
                },
            ],
            {
              "particulars": tr("Total"),
              "debit": _n(totals["total_debit"]),
              "credit": _n(totals["total_credit"]),
            },
          ),
        ],
      );
    },
  ),

  "trial": ReportDef(
    "trial",
    "🧮",
    "Trial Balance",
    "Debit and credit totals per account — both sides must match.",
    true,
    (r, tr) async {
      final byAccount = <String, List<double>>{};
      for (final e in _list((await _journal(r))["entries"])) {
        final a = byAccount.putIfAbsent("${e["account"]}", () => [0, 0]);
        a[0] += _n(e["debit"]);
        a[1] += _n(e["credit"]);
      }
      // each account shows its net balance on one side, like a classic trial balance
      final rows = (byAccount.entries.toList()..sort((a, b) => a.key.compareTo(b.key))).map((e) {
        final net = e.value[0] - e.value[1];
        return <String, dynamic>{
          "account": e.key,
          "debit": net > 0 ? net : null,
          "credit": net < 0 ? -net : null,
        };
      }).toList();
      final dr = rows.fold<double>(0, (s, x) => s + _n(x["debit"]));
      final cr = rows.fold<double>(0, (s, x) => s + _n(x["credit"]));
      final balanced = (dr - cr).abs() < 0.01;
      return ReportModel(
        [
          Kpi(tr("Total Debit"), dr, type: ColType.money),
          Kpi(tr("Total Credit"), cr, type: ColType.money),
          Kpi(
            tr("Status"),
            balanced ? tr("Balanced ✓") : tr("Not balanced"),
            tone: balanced ? "good" : "bad",
          ),
        ],
        [
          ReportSection(
            tr("Trial Balance"),
            [_text("account", tr("Account")), _money("debit", tr("Debit")), _money("credit", tr("Credit"))],
            rows,
            {"account": tr("Total"), "debit": dr, "credit": cr},
          ),
        ],
      );
    },
  ),

  "goods": ReportDef(
    "goods",
    "📦",
    "Goods Movement",
    "Units sold and bought per item, with their value.",
    true,
    (r, tr) async {
      final g = Map<String, dynamic>.from((await _journal(r))["goods"] ?? {});
      final rows = [
        for (final i in _list(g["items"]))
          {
            "item": i["item"],
            "sold_qty": _n(i["sold_qty"]),
            "sales_value": _n(i["sales_value"]),
            "bought_qty": _n(i["bought_qty"]),
            "purchase_value": _n(i["purchase_value"]),
            "net_qty": _n(i["net_qty"]),
          },
      ];
      double sum(String k) => rows.fold(0, (s, x) => s + _n(x[k]));
      return ReportModel(
        [
          Kpi(tr("Items"), rows.length),
          Kpi(tr("Total Sold"), _n(g["total_sold_qty"])),
          Kpi(tr("Total Bought"), _n(g["total_bought_qty"])),
        ],
        [
          ReportSection(
            tr("Goods Movement"),
            [
              _text("item", tr("Item")),
              _count("sold_qty", tr("Sold")),
              _money("sales_value", tr("Sales value")),
              _count("bought_qty", tr("Bought")),
              _money("purchase_value", tr("Purchase value")),
              _count("net_qty", tr("Net change")),
            ],
            rows,
            {
              "item": tr("Total"),
              "sold_qty": sum("sold_qty"),
              "sales_value": sum("sales_value"),
              "bought_qty": sum("bought_qty"),
              "purchase_value": sum("purchase_value"),
            },
          ),
        ],
      );
    },
  ),

  "stock": ReportDef(
    "stock",
    "🏷️",
    "Stock Report",
    "Current stock, its value and what needs reordering.",
    false,
    (r, tr) async {
      final rows = [
        for (final i in _list(await Api.get("/inventory")))
          () {
            final qty = _n(i["quantity"]);
            final cost = _n(i["cost_price"] ?? i["unit_price"]);
            final low = qty <= _n(i["reorder_level"]);
            return <String, dynamic>{
              "name": i["name"],
              "category": tr("${i["category"] ?? "—"}"),
              "quantity": qty,
              "unit": tr("${i["unit"] ?? ""}"),
              "cost": cost,
              "value": qty * cost,
              "reorder_level": _n(i["reorder_level"]),
              "status": low ? tr("Reorder") : tr("In stock"),
              "_bad": low,
            };
          }(),
      ];
      final total = rows.fold<double>(0, (s, x) => s + _n(x["value"]));
      final low = rows.where((x) => x["_bad"] == true).length;
      return ReportModel(
        [
          Kpi(tr("Items"), rows.length),
          Kpi(tr("Total Stock Value"), total, type: ColType.money),
          Kpi(tr("Low Stock Items"), low, tone: low > 0 ? "bad" : "good"),
        ],
        [
          ReportSection(
            tr("Stock Report"),
            [
              _text("name", tr("Item")),
              _text("category", tr("Category")),
              _count("quantity", tr("Qty")),
              _text("unit", tr("Unit")),
              _money("cost", tr("Unit Cost")),
              _money("value", tr("Stock value")),
              _count("reorder_level", tr("Reorder Level")),
              _text("status", tr("Status")),
            ],
            rows,
            {"name": tr("Total"), "value": total},
          ),
        ],
      );
    },
  ),

  "procurement": ReportDef(
    "procurement",
    "🛒",
    "Procurement Orders",
    "Purchase orders, their suppliers and status.",
    true,
    (r, tr) async {
      final orders = _list(
        await Api.get("/procurement"),
      ).where((o) => _inRange(o["date"] ?? o["order_date"] ?? o["created_at"], r)).toList();
      final rows = [
        for (final o in orders)
          {
            "no": o["procurement_no"] ?? "—",
            "date": o["date"] ?? o["order_date"] ?? o["created_at"],
            "supplier": o["selected_supplier_name"] ?? o["supplier_name"] ?? "—",
            "items": o["items"] is List
                ? _list(o["items"]).map((i) => "${i["item_name"]}").join(", ")
                : "${o["item_name"] ?? "—"}",
            "arrival": o["arrival_date"],
            "total": _n(o["total_cost"]),
            "status": tr(_words(o["status"] ?? "pending")),
          },
      ];
      final total = rows.fold<double>(0, (s, x) => s + _n(x["total"]));
      return ReportModel(
        [
          Kpi(tr("Orders"), rows.length),
          Kpi(tr("Total Cost"), total, type: ColType.money),
          Kpi(tr("Pending"), orders.where((o) => "${o["status"] ?? "pending"}" == "pending").length),
        ],
        [
          ReportSection(
            tr("Procurement Orders"),
            [
              _text("no", tr("Order No.")),
              _date("date", tr("Order Date")),
              _text("supplier", tr("Supplier")),
              _text("items", tr("Items")),
              _date("arrival", tr("Expected Arrival")),
              _money("total", tr("Total Cost")),
              _text("status", tr("Status")),
            ],
            rows,
            {"no": tr("Total"), "total": total},
          ),
        ],
      );
    },
  ),

  "suppliers": ReportDef(
    "suppliers",
    "🤝",
    "Supplier Directory",
    "Contacts, delivery cost and lead time of every supplier.",
    false,
    (r, tr) async {
      final rows = [
        for (final s in _list(await Api.get("/suppliers")))
          {
            "name": s["name"],
            "company": s["company_name"] ?? "—",
            "contact": s["contact_number"] ?? "—",
            "items": s["items_supplied"] is List ? (s["items_supplied"] as List).length : 0,
            "delivery_cost": _n(s["delivery_cost"]),
            "lead_time": _n(s["lead_time_days"]),
            "location": s["delivery_location"] ?? "—",
          },
      ];
      final avg = rows.isEmpty ? 0 : rows.fold<double>(0, (s, x) => s + _n(x["delivery_cost"])) / rows.length;
      return ReportModel(
        [Kpi(tr("Suppliers"), rows.length), Kpi(tr("Avg. delivery cost"), avg, type: ColType.money)],
        [
          ReportSection(tr("Supplier Directory"), [
            _text("name", tr("Supplier")),
            _text("company", tr("Company")),
            _text("contact", tr("Contact")),
            _count("items", tr("Items")),
            _money("delivery_cost", tr("Delivery Cost (LKR)")),
            _count("lead_time", tr("Lead Time")),
            _text("location", tr("Location")),
          ], rows),
        ],
      );
    },
  ),

  "transactions": ReportDef(
    "transactions",
    "💳",
    "Transactions Report",
    "Every sale, purchase, expense, deposit and transfer.",
    true,
    (r, tr) async {
      final txns = _list(await Api.get("/transactions")).where((x) => _inRange(x["created_at"], r)).toList()
        ..sort((a, b) => "${a["created_at"]}".compareTo("${b["created_at"]}"));
      const moneyIn = ["sale", "deposit"];
      final rows = [
        for (final x in txns)
          {
            "date": x["created_at"],
            "type": tr(_words(x["transaction_type"])),
            "payment": tr(_words(x["payment_method"])),
            "detail": x["items"] is List && (x["items"] as List).isNotEmpty
                ? _list(
                    x["items"],
                  ).map((i) => "${i["item_name"]} × ${formatCell(i["quantity"], ColType.number)}").join(", ")
                : "${x["category"] ?? x["description"] ?? "—"}",
            "money_in": moneyIn.contains(x["transaction_type"]) ? _n(x["amount"]) : null,
            "money_out": moneyIn.contains(x["transaction_type"]) ? null : _n(x["amount"]),
          },
      ];
      final tin = rows.fold<double>(0, (s, x) => s + _n(x["money_in"]));
      final tout = rows.fold<double>(0, (s, x) => s + _n(x["money_out"]));
      return ReportModel(
        [
          Kpi(tr("Transactions"), rows.length),
          Kpi(tr("Money in"), tin, type: ColType.money, tone: "good"),
          Kpi(tr("Money out"), tout, type: ColType.money, tone: "bad"),
          Kpi(tr("Net change"), tin - tout, type: ColType.money, tone: tin - tout >= 0 ? "good" : "bad"),
        ],
        [
          ReportSection(
            tr("Transactions Report"),
            [
              _date("date", tr("Date")),
              _text("type", tr("Type")),
              _text("payment", tr("Payment")),
              _text("detail", tr("Details")),
              _money("money_in", tr("Money in")),
              _money("money_out", tr("Money out")),
            ],
            rows,
            {"detail": tr("Total"), "money_in": tin, "money_out": tout},
          ),
        ],
      );
    },
  ),

  "agency": ReportDef(
    "agency",
    "🏦",
    "Agency Banking Report",
    "Customer deposits, withdrawals and transfers with fees and commission.",
    true,
    (r, tr) async {
      final txns = _list(await Api.get("/agency-banking")).where((x) => _inRange(x["created_at"], r)).toList()
        ..sort((a, b) => "${a["created_at"]}".compareTo("${b["created_at"]}"));
      final rows = [
        for (final x in txns)
          {
            "date": x["created_at"],
            "customer": x["customer_name"] ?? "—",
            "type": tr(_words(x["transaction_type"])),
            "amount": _n(x["amount"]),
            "fee": _n(x["service_fee"]),
            "commission": _n(x["commission"]),
            "status": tr(_words(x["status"] ?? "")),
          },
      ];
      double sum(String k) => rows.fold(0, (s, x) => s + _n(x[k]));
      return ReportModel(
        [
          Kpi(tr("Transactions"), rows.length),
          Kpi(tr("Volume"), sum("amount"), type: ColType.money),
          Kpi(tr("Service Fees"), sum("fee"), type: ColType.money),
          Kpi(tr("Commission"), sum("commission"), type: ColType.money, tone: "good"),
        ],
        [
          ReportSection(
            tr("Agency Banking Report"),
            [
              _date("date", tr("Date")),
              _text("customer", tr("Customer")),
              _text("type", tr("Type")),
              _money("amount", tr("Amount (LKR)")),
              _money("fee", tr("Service Fee (LKR)")),
              _money("commission", tr("Commission (LKR)")),
              _text("status", tr("Status")),
            ],
            rows,
            {
              "customer": tr("Total"),
              "amount": sum("amount"),
              "fee": sum("fee"),
              "commission": sum("commission"),
            },
          ),
        ],
      );
    },
  ),
};
