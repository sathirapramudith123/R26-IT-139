// src/components/reports/IncomeStatement.jsx
"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatters";

const num = (v) => Number(v || 0);

/**
 * Consumes the SAME server-computed contract as the Flutter app:
 *   total_revenue, cost_of_goods_sold, gross_profit,
 *   operating_expenses, net_profit, profit_margin_pct
 * Any missing total is derived so the statement still balances.
 */
export default function IncomeStatement({ data }) {
  const d = data || {};

  const revenue = num(d.total_revenue ?? d.revenue);
  const cogs = num(d.cost_of_goods_sold ?? d.costOfGoodsSold);
  const grossProfit =
    d.gross_profit != null ? num(d.gross_profit) : revenue - cogs;
  const opex = num(d.operating_expenses ?? d.operatingExpenses);
  const netProfit =
    d.net_profit != null ? num(d.net_profit) : grossProfit - opex;
  const margin =
    d.profit_margin_pct != null
      ? num(d.profit_margin_pct)
      : revenue
      ? (netProfit / revenue) * 100
      : 0;

  const isProfit = netProfit >= 0;
  const posNeg = isProfit
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile label="Total Revenue" value={formatCurrency(revenue)} />
        <Tile label="Gross Profit" value={formatCurrency(grossProfit)} />
        <Tile
          label={isProfit ? "Net Profit" : "Net Loss"}
          value={formatCurrency(netProfit)}
          sub={`Margin: ${margin.toFixed(1)}%`}
          valueClass={posNeg}
        />
      </div>

      {/* Statement */}
      <Card>
        <h3 className="mb-2 font-semibold">Financial Summary</h3>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Total Revenue / Sales" value={formatCurrency(revenue)} />
            <Row
              label="Cost of Goods Sold"
              value={`(${formatCurrency(cogs)})`}
              muted
            />
            <Row
              label="Gross Profit"
              value={formatCurrency(grossProfit)}
              strong
              divider
            />
            <Row
              label="Operating Expenses"
              value={`(${formatCurrency(opex)})`}
              muted
            />

            <tr className="border-t-2 border-gray-900 dark:border-gray-100">
              <td className="px-4 py-4 font-semibold">
                {isProfit ? "Net Income / Profit" : "Net Loss"}
              </td>
              <td className={`px-4 py-4 text-right font-bold ${posNeg}`}>
                <span className="inline-flex items-center gap-1.5">
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(netProfit)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, valueClass = "" }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </Card>
  );
}

function Row({ label, value, strong, muted, divider }) {
  return (
    <tr className={divider ? "border-t border-gray-200 dark:border-gray-800" : ""}>
      <td
        className={`px-4 py-2.5 ${strong ? "font-semibold" : ""} ${
          muted ? "text-gray-600 dark:text-gray-400" : ""
        }`}
      >
        {label}
      </td>
      <td
        className={`px-4 py-2.5 text-right tabular-nums ${
          strong ? "font-semibold" : ""
        } ${muted ? "text-gray-600 dark:text-gray-400" : ""}`}
      >
        {value}
      </td>
    </tr>
  );
}