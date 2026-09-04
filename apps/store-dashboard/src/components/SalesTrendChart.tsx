import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendPoint {
  date: string;
  orderCount: number;
}

// Upgraded from a hand-rolled CSS bar chart to Recharts per this
// milestone's approval - the underlying query/data shape
// (store-dashboard.service.ts's getStoreDashboardSummary) is completely
// unchanged; only the rendering library changed. rgb(var(--color-x))
// literals (not Tailwind classes) are used for SVG fill/stroke because
// Recharts renders raw SVG attributes, which still resolve CSS custom
// properties, so the chart repaints correctly on dark-mode toggle without
// re-rendering.
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const date = new Date(label ?? "");
  const formatted = Number.isNaN(date.getTime())
    ? label
    : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-popover">
      <div className="mb-0.5 font-medium text-text-primary">{formatted}</div>
      <div className="text-text-secondary">
        {payload[0].value} order{payload[0].value === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="rgb(var(--color-primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgb(var(--color-border-default))" strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          tick={{ fill: "rgb(var(--color-text-secondary))", fontSize: 11 }}
          axisLine={{ stroke: "rgb(var(--color-border-default))" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "rgb(var(--color-text-secondary))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--color-border-strong))", strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="orderCount"
          stroke="rgb(var(--color-primary))"
          strokeWidth={2}
          fill="url(#salesTrendFill)"
          activeDot={{ r: 4, fill: "rgb(var(--color-primary))", stroke: "rgb(var(--color-surface-card))", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
