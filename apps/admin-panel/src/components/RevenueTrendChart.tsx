import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RevenuePoint {
  date: string;
  revenue: string;
}

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Same Recharts pattern as store-dashboard's SalesTrendChart/RevenueTrendChart
// (rgb(var(--color-x)) literals so the SVG repaints correctly on dark-mode
// toggle) - kept as its own small component per app, consistent with how
// each frontend already owns its own component tree rather than importing
// across apps.
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const date = new Date(label ?? "");
  const formatted = Number.isNaN(date.getTime())
    ? label
    : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-popover">
      <div className="mb-0.5 font-medium text-text-primary">{formatted}</div>
      <div className="text-text-secondary">{formatMoney(payload[0].value)}</div>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  const points = data.map((d) => ({ date: d.date, revenue: Number(d.revenue) }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="platformRevenueFill" x1="0" y1="0" x2="0" y2="1">
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
          tickFormatter={(value: number) => formatMoney(value)}
          tick={{ fill: "rgb(var(--color-text-secondary))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--color-border-strong))", strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="rgb(var(--color-primary))"
          strokeWidth={2}
          fill="url(#platformRevenueFill)"
          activeDot={{ r: 4, fill: "rgb(var(--color-primary))", stroke: "rgb(var(--color-surface-card))", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
