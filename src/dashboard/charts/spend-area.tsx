"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/** OWNER: UI · Recharts area chart: 24 h spend vs budget. */
export function SpendArea({
  data = [
    { time: "09:00", spend: 0.05, budget: 1.0 },
    { time: "10:00", spend: 0.15, budget: 1.0 },
    { time: "11:00", spend: 0.28, budget: 1.0 },
    { time: "12:00", spend: 0.45, budget: 1.0 },
    { time: "13:00", spend: 0.62, budget: 1.0 },
    { time: "14:00", spend: 0.78, budget: 1.0 },
    { time: "15:00", spend: 0.95, budget: 1.0 },
    { time: "16:00", spend: 1.15, budget: 1.0 },
    { time: "17:00", spend: 1.35, budget: 1.0 },
  ],
  budgetCeiling = 1.0,
}: {
  data?: { time: string; spend: number; budget: number }[];
  budgetCeiling?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            Cumulative Spend Trajectory (24h)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Hourly spend tracking against configured policy ceiling.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Actual Spend ($)
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            Hourly Limit (${budgetCeiling.toFixed(2)})
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#71717a" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 11, fill: "#71717a" }}
            />
            <Tooltip
              formatter={(val: number | string) => [`$${Number(val).toFixed(2)}`, "Cumulative Spend"]}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: "#18181b",
                borderColor: "#27272a",
                borderRadius: "8px",
                color: "#f4f4f5",
                fontSize: "12px",
              }}
            />
            <ReferenceLine
              y={budgetCeiling}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: `Limit: $${budgetCeiling.toFixed(2)}`,
                fill: "#ef4444",
                fontSize: 10,
                position: "right",
              }}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#spendGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
