"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEMAND_MAE } from "@/lib/modelTrust";
import { t } from "@/lib/i18n";

// Past 8 weeks of real sales, then next week's forecast with a band for the model's usual error
export default function ForecastChart({ history = [], forecast }) {
  if (!history.length || forecast == null) return null;
  const f = Number(forecast);
  const data = [
    ...history.map((h, i) => ({
      label: h.week.slice(5), // MM-DD
      actual: Number(h.units),
      // join the forecast line to the last real week
      ...(i === history.length - 1
        ? { forecast: Number(h.units), band: [Number(h.units), Number(h.units)] }
        : {}),
    })),
    {
      label: t("Next week"),
      forecast: f,
      band: [Math.max(0, f - DEMAND_MAE), f + DEMAND_MAE],
    },
  ];

  return (
    <div className="mt-3 h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={34} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              fontSize: 12,
              border: "none",
              boxShadow: "0 8px 24px rgba(42,91,219,0.18)",
            }}
            formatter={(v, key) =>
              key === "band"
                ? [`${Math.round(v[0])} – ${Math.round(v[1])}`, t("Likely range")]
                : [`${Math.round(v)} ${t("units")}`, key === "actual" ? t("Sold") : t("Forecast")]
            }
          />
          <Area dataKey="band" stroke="none" fill="#2a5bdb" fillOpacity={0.12} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2a5bdb"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#3ddc97"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 4, fill: "#3ddc97" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 bg-brand-600" /> {t("Sold")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-accent" /> {t("Forecast")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm bg-brand-600/15" /> {t("Likely range")}
        </span>
      </div>
    </div>
  );
}
