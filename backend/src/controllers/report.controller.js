import { supabase } from "../config/supabase.js";

export const getIncomeStatement = async (req, res, next) => {
  try {
    const userId = req.user.id;

    
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    let totalRevenue = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;

    // ගනුදෙනු වර්ගය අනුව මුදල් වෙන්කර ගණනය කිරීම
    (transactions || []).forEach((t) => {
      const amount = Number(t.amount) || 0;
      const type = `${t.transaction_type}`.toLowerCase();

      if (type === "sale" || type === "deposit") {
        totalRevenue += amount;
      } else if (type === "purchase") {
        costOfGoodsSold += amount;
      } else if (type === "expense") {
        operatingExpenses += amount;
      }
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