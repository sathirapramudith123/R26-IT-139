import { supabase } from "../config/supabase.js";

const num = (v) => Number(v) || 0;

// SALE එකක item list එක ලබා ගැනීම (items JSONB array එක හෝ පරණ single item_name/quantity)
const saleLines = (t) => {
  if (Array.isArray(t.items) && t.items.length) return t.items;
  if (t.item_name && t.quantity) return [{ item_name: t.item_name, quantity: t.quantity }];
  return [];
};

export const getIncomeStatement = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Transactions සහ Inventory දෙකම එකවර ලබා ගැනීම
    // (COGS එකට inventory එකේ cost_price එක ඕන — sale line එකේ snapshot එකක් නැති අවස්ථා වලට)
    const [{ data: transactions, error: txErr }, { data: inventory, error: invErr }] =
      await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", userId),
        supabase.from("inventory").select("item_name, cost_price, unit_price").eq("user_id", userId),
      ]);

    if (txErr) throw txErr;
    if (invErr) throw invErr;

    // item_name -> unit cost map (fallback)
    const costMap = {};
    (inventory || []).forEach((i) => {
      costMap[i.item_name] = num(i.cost_price ?? i.unit_price);
    });

    let totalRevenue = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;

    (transactions || []).forEach((t) => {
      const amount = num(t.amount);
      const type = `${t.transaction_type}`.toLowerCase();

      if (type === "sale") {
        // Revenue = විකුණපු මුදල (selling price)
        totalRevenue += amount;

        // COGS = විකුණපු භාණ්ඩ වල cost එක විතරයි
        saleLines(t).forEach((line) => {
          const qty = num(line.quantity);
          // sale line එකේ cost snapshot එකක් තියෙනවා නම් ඒක, නැත්නම් current inventory cost එක
          const unitCost = line.cost_price != null
            ? num(line.cost_price)
            : (costMap[line.item_name] || 0);
          costOfGoodsSold += unitCost * qty;
        });
      } else if (type === "expense") {
        operatingExpenses += amount;
      }
      // PURCHASE -> cash→stock asset swap. P&L එකට බලපාන්නෙ නෑ.
      // DEPOSIT / TRANSFER -> financing / pass-through. Income නෙවෙයි.
    });

    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        cost_of_goods_sold: costOfGoodsSold,
        gross_profit: grossProfit,
        operating_expenses: operatingExpenses,
        net_profit: netProfit,
        profit_margin_pct: profitMargin,
      },
    });
  } catch (err) {
    next(err);
  }
};