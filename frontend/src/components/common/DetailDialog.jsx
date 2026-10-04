"use client";

import { useEffect } from "react";
import {
  X,
  Package,
  Truck,
  StickyNote,
  Trophy,
  ShoppingBasket,
  NotebookText,
  Wallet,
  User,
  ShieldCheck,
  Phone,
  MapPin,
  Boxes,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useReadableLocation } from "@/lib/geo";

/*
 * "View one record" dialog — same look as the mobile details screens:
 * a blue header (title, status, big figure, up to three facts) followed by cards.
 * Pages pass `kind` (transactions | inventory | procurement | suppliers | agency-banking);
 * without it the kind is guessed from the record's fields.
 */

/* ------------------------------- formatting ------------------------------- */

const num = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const money = (v) =>
  `${num(v) < 0 ? "-" : ""}LKR ${Math.abs(num(v)).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const qty = (v) => {
  const n = num(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const pad = (n) => String(n).padStart(2, "0");
function dateOf(v, time = false) {
  const d = new Date(v);
  if (!v || isNaN(d)) return "—";
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return time ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
}

/** "cash_deposit" → "Cash Deposit" (then translated) */
const words = (v) =>
  t(
    String(v ?? "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  );

const hasText = (v) => v != null && String(v).trim() !== "";
const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
const unitOf = (u) => (hasText(u) && u !== "unit" ? ` ${t(u)}` : "");

// status pill colours (text colour on a white pill, as on mobile)
const TONE = {
  green: "text-emerald-600",
  red: "text-rose-600",
  amber: "text-amber-600",
  blue: "text-brand-600",
  purple: "text-violet-600",
  grey: "text-slate-500",
};

/* --------------------------------- layout --------------------------------- */

function Header({ heading, subheading, status, figure, figureCaption, facts = [] }) {
  return (
    <div className="gradient-brand rounded-2xl p-5 text-white shadow-elevated">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold leading-tight">{heading}</p>
          {subheading && <p className="mt-0.5 text-sm text-white/75">{subheading}</p>}
        </div>
        {status && (
          <span className={`shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold ${TONE[status[1]]}`}>
            {status[0]}
          </span>
        )}
      </div>
      {figure && (
        <>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{figure}</p>
          {figureCaption && <p className="text-xs text-white/75">{figureCaption}</p>}
        </>
      )}
      {facts.length > 0 && (
        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
        >
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="text-[11px] text-white/70">{label}</p>
              <p className="truncate text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="w-36 shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-right text-sm font-semibold text-slate-800 dark:text-slate-100 ${color || ""}`}>
        {value}
      </span>
    </div>
  );
}

function Line({ title, detail, trailing }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {detail && <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      {trailing && (
        <p className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">{trailing}</p>
      )}
    </div>
  );
}

// A saved location as an address — never raw "lat, lng" (those are looked up, or linked to the map)
function LocationValue({ value }) {
  const loc = useReadableLocation(value);
  if (!loc.point) return value;
  if (loc.pending) return <span className="font-normal text-slate-400">{t("Finding address…")}</span>;
  return (
    <span className="block">
      {loc.text || t("Pinned on the map")}
      <a
        href={`https://www.google.com/maps?q=${loc.point.lat},${loc.point.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        {t("Open in Google Maps")} ↗
      </a>
    </span>
  );
}

const Divider = () => <div className="my-2 border-t border-slate-100 dark:border-slate-800" />;

/* ------------------------------- Procurement ------------------------------- */

const PROC_STATUS = {
  received: ["Received", "green"],
  ordered: ["Ordered", "blue"],
  cancelled: ["Cancelled", "grey"],
};

function Procurement({ d }) {
  const items = list(d.items).length
    ? list(d.items)
    : d.item_name
      ? [{ item_name: d.item_name, quantity: d.quantity, unit_cost: d.unit_cost }]
      : [];
  const suppliers = list(d.recommended_suppliers);
  const total = d.total_cost ?? items.reduce((s, l) => s + num(l.quantity) * num(l.unit_cost), 0);
  const [statusKey, tone] = PROC_STATUS[String(d.status ?? d.procurement_status ?? "").toLowerCase()] ?? [
    "Pending",
    "amber",
  ];
  const status = [t(statusKey), tone];
  const supplier = d.selected_supplier_name || d.supplier_name;

  return (
    <>
      <Header
        heading={d.procurement_no || t("Procurement Order")}
        status={status}
        figure={money(total)}
        figureCaption={t("Total Cost")}
        facts={[
          [t("Order Date"), dateOf(d.order_date ?? d.date ?? d.created_at)],
          [t("Expected Arrival"), dateOf(d.arrival_date)],
          [t("Items"), items.length],
        ]}
      />
      <Section title={t("Items")} icon={Package}>
        {items.map((l, i) => (
          <Line
            key={i}
            title={l.item_name || "—"}
            detail={`${qty(l.quantity)}${unitOf(l.unit)} × ${money(l.unit_cost)}`}
            trailing={money(num(l.quantity) * num(l.unit_cost))}
          />
        ))}
        <Divider />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("Total")}</span>
          <span className="font-display text-base font-bold text-brand-600 dark:text-brand-400">
            {money(total)}
          </span>
        </div>
      </Section>
      {(hasText(supplier) || hasText(d.delivery_location)) && (
        <Section title={t("Delivery")} icon={Truck}>
          {hasText(supplier) && <Row label={t("Supplier")} value={supplier} />}
          {hasText(d.delivery_location) && (
            <Row label={t("Delivery Location")} value={<LocationValue value={d.delivery_location} />} />
          )}
        </Section>
      )}
      {suppliers.length > 0 && (
        <Section title={t("Recommended Suppliers")} icon={Trophy}>
          <div className="space-y-2">
            {suppliers.map((s, i) => (
              <div
                key={s.id ?? i}
                className={`rounded-xl border p-3 ${
                  i === 0
                    ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name || "—"}</p>
                  {i === 0 && (
                    <span className="text-[11px] font-bold text-emerald-600">{t("🏆 Best overall")}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[
                    `${s.matchedCount ?? 0}/${items.length} ${t("items")}`,
                    s.totalPrice != null && money(s.totalPrice),
                    s.distanceKm != null && `${num(s.distanceKm).toFixed(1)} km`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {Array.isArray(s.missing) && s.missing.length > 0 && (
                  <p className="text-xs text-rose-600">
                    {t("Missing:")} {s.missing.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
      {hasText(d.special_note) && (
        <Section title={t("Special Note")} icon={StickyNote}>
          <p className="text-sm text-slate-700 dark:text-slate-300">{d.special_note}</p>
        </Section>
      )}
    </>
  );
}

/* ------------------------------- Transaction ------------------------------- */

function Transaction({ d }) {
  const type = String(d.transaction_type ?? "").toLowerCase();
  const moneyIn = type === "sale" || type === "deposit";
  const items = list(d.items);
  return (
    <>
      <Header
        heading={words(type)}
        status={moneyIn ? [t("Money in"), "green"] : [t("Money out"), "red"]}
        figure={`${moneyIn ? "+" : "-"} ${money(d.amount)}`}
        figureCaption={moneyIn ? t("Credit (money in)") : t("Debit (money out)")}
        facts={[
          [t("Date"), dateOf(d.created_at, true)],
          [t("Payment"), words(d.payment_method)],
          ...(items.length ? [[t("Items"), items.length]] : []),
        ]}
      />
      {items.length > 0 && (
        <Section
          title={type === "purchase" ? t("Items in this purchase") : t("Items in this sale")}
          icon={ShoppingBasket}
        >
          {items.map((l, i) => (
            <Line
              key={i}
              title={l.item_name || "—"}
              detail={`${qty(l.quantity)} × ${money(l.unit_price ?? l.cost_price)}`}
              trailing={money(l.amount ?? num(l.quantity) * num(l.unit_price))}
            />
          ))}
          <Divider />
          <Row label={t("Total")} value={money(d.amount)} />
        </Section>
      )}
      {(hasText(d.category) || hasText(d.description)) && (
        <Section title={t("Details")} icon={NotebookText}>
          {hasText(d.category) && <Row label={t("Category")} value={t(d.category)} />}
          {hasText(d.description) && <Row label={t("Description")} value={d.description} />}
        </Section>
      )}
    </>
  );
}

/* -------------------------------- Inventory -------------------------------- */

function Inventory({ d }) {
  const s = String(d.item_status ?? "").toUpperCase();
  const low = num(d.quantity) <= num(d.reorder_level);
  const status =
    s === "OUT_OF_STOCK" || num(d.quantity) <= 0
      ? [t("Out of stock"), "red"]
      : s === "RUNNING_OUT" || low
        ? [t("Running out"), "amber"]
        : [t("In stock"), "green"];
  const unit = unitOf(d.unit);
  const minCost = num(d.cost_min);
  const maxCost = num(d.cost_max);
  const totalValue = d.total_cost ?? num(d.quantity) * num(d.cost_price);
  return (
    <>
      <Header
        heading={d.name ?? d.item_name ?? "—"}
        subheading={hasText(d.category) ? t(d.category) : null}
        status={status}
        figure={money(totalValue)}
        figureCaption={t("Total Stock Value")}
        facts={[
          [t("Quantity"), `${qty(d.quantity)}${unit}`],
          [t("Reorder Level"), `${qty(d.reorder_level)}${unit}`],
          ...(d.batch_count != null ? [[t("Batches"), d.batch_count]] : []),
        ]}
      />
      <Section title={t("Cost")} icon={Wallet}>
        <Row label={t("Avg. Unit Cost")} value={money(d.cost_price)} />
        {maxCost > 0 && minCost !== maxCost && (
          <Row label={t("Cost Range")} value={`${money(minCost)} – ${money(maxCost)}`} />
        )}
        <Row label={t("Total Stock Value")} value={money(totalValue)} />
      </Section>
      <Section title={t("Supplier")} icon={Truck}>
        <Row label={t("Supplier")} value={hasText(d.supplier_name) ? d.supplier_name : "—"} />
        <Row label={t("Lead Time")} value={`${qty(d.lead_time_days ?? 1)} ${t("days")}`} />
        {hasText(d.received_at) && <Row label={t("Last Received")} value={dateOf(d.received_at)} />}
      </Section>
    </>
  );
}

/* -------------------------------- Supplier --------------------------------- */

function Supplier({ d }) {
  const items = list(d.items_supplied);
  return (
    <>
      <Header
        heading={d.name ?? d.supplier_name ?? "—"}
        subheading={hasText(d.company_name) ? d.company_name : null}
        status={[`${items.length} ${t("items")}`, "blue"]}
        facts={[
          [t("Delivery Cost (LKR)"), money(d.delivery_cost)],
          [t("Lead Time"), `${qty(d.lead_time_days ?? 1)} ${t("days")}`],
        ]}
      />
      <Section title={t("Contact")} icon={Phone}>
        <Row label={t("Contact Number")} value={hasText(d.contact_number) ? d.contact_number : "—"} />
        {hasText(d.email) && <Row label={t("Email")} value={d.email} />}
      </Section>
      {items.length > 0 && (
        <Section title={t("Items Supplied")} icon={Boxes}>
          {items.map((it, i) => (
            <Line
              key={i}
              title={it.item_name || "—"}
              detail={`${qty(it.quantity)}${unitOf(it.unit)}`}
              trailing={it.unit_price != null ? money(it.unit_price) : null}
            />
          ))}
        </Section>
      )}
      {hasText(d.delivery_location) && (
        <Section title={t("Location")} icon={MapPin}>
          <p className="text-sm text-slate-700 dark:text-slate-300">{t(d.delivery_location)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {t("Switch to Map on the Suppliers page to see how far it is.")}
          </p>
        </Section>
      )}
    </>
  );
}

/* ----------------------------- Agency banking ------------------------------ */

function AgencyBanking({ d }) {
  const flagged = d.is_anomaly === true;
  const status = String(d.status ?? d.banking_status ?? "");
  return (
    <>
      <Header
        heading={words(d.transaction_type)}
        subheading={hasText(d.customer_name) ? d.customer_name : null}
        status={
          flagged ? [t("⚠ Looks unusual"), "red"] : [hasText(status) ? words(status) : t("✓ Normal"), "green"]
        }
        figure={money(d.amount)}
        figureCaption={t("Amount (LKR)")}
        facts={[
          [t("Date"), dateOf(d.created_at, true)],
          [t("Service Fee"), money(d.service_fee)],
          [t("Commission"), money(d.commission)],
        ]}
      />
      <Section title={t("Customer")} icon={User}>
        <Row label={t("Customer Name")} value={hasText(d.customer_name) ? d.customer_name : "—"} />
        {hasText(d.customer_phone) && <Row label={t("Customer Phone")} value={d.customer_phone} />}
        {hasText(d.customer_nic) && <Row label={t("Customer NIC")} value={d.customer_nic} />}
        {hasText(d.account_number) && <Row label={t("Account Number")} value={d.account_number} />}
        {hasText(d.source_of_funds) && <Row label={t("Source of Funds")} value={t(d.source_of_funds)} />}
      </Section>
      <Section title={t("Account safety")} icon={ShieldCheck}>
        <Row
          label={t("AI check")}
          value={flagged ? t("⚠ Looks unusual") : t("✓ Normal")}
          color={flagged ? "!text-rose-600" : "!text-emerald-600"}
        />
        {d.anomaly_score != null && <Row label={t("Risk score")} value={`${qty(d.anomaly_score)} / 100`} />}
        {flagged && (
          <p className="mt-1 text-xs text-rose-600">
            {t("This transaction looks different from your usual pattern — worth a quick check.")}
          </p>
        )}
      </Section>
    </>
  );
}

/* ---------------------------------- dialog --------------------------------- */

function guessKind(d) {
  if (d.customer_name !== undefined || d.is_anomaly !== undefined) return "agency-banking";
  if (d.transaction_type && d.payment_method !== undefined) return "transactions";
  if (Array.isArray(d.items) || d.procurement_no) return "procurement";
  if (Array.isArray(d.items_supplied) || d.contact_number !== undefined) return "suppliers";
  if (d.reorder_level !== undefined) return "inventory";
  return "transactions";
}

const VIEWS = {
  procurement: [Procurement, "Procurement Order"],
  transactions: [Transaction, "Transaction"],
  inventory: [Inventory, "Inventory Item"],
  suppliers: [Supplier, "Supplier"],
  "agency-banking": [AgencyBanking, "Agency Banking"],
};

export default function DetailDialog({ open, kind, data, onClose }) {
  // Esc closes the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !data) return null;
  const [View, title] = VIEWS[kind] ?? VIEWS[guessKind(data)];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-slate-50 p-4 shadow-elevated dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">{t(title)}</h3>
          <button onClick={onClose} className="btn-ghost !px-2.5 !py-1.5" aria-label={t("Close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <View d={data} />
        </div>
      </div>
    </div>
  );
}
