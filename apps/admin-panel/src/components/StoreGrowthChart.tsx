import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface GrowthPoint {
  month: string;
  totalStores: number;
}

// Same dark-mode-safe Recharts pattern as RevenueTrendChart - a cumulative
// total-stores-by-month line, since "growth" here means the platform's
// running store count climbing over time, not new-signups-per-month.
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-popover">
      <div className="mb-0.5 font-medium text-text-primary">{label}</div>
      <div className="text-text-secondary">
        {payload[0].value} store{payload[0].value === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function StoreGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgb(var(--color-border-default))" strokeDasharray="4 4" />
        <XAxis
          dataKey="month"
          tick={{ fill: "rgb(var(--color-text-secondary))", fontSize: 11 }}
          axisLine={{ stroke: "rgb(var(--color-border-default))" }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fill: "rgb(var(--color-text-secondary))", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--color-border-strong))", strokeDasharray: "4 4" }} />
        <Line
          type="monotone"
          dataKey="totalStores"
          stroke="rgb(var(--color-primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "rgb(var(--color-primary))" }}
          activeDot={{ r: 5, fill: "rgb(var(--color-primary))", stroke: "rgb(var(--color-surface-card))", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
