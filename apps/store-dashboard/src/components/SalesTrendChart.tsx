interface TrendPoint {
  date: string;
  orderCount: number;
}

// Single-series bar chart, per dataviz guidance: one hue (the design
// system's primary), thin rounded-top bars anchored to a baseline, a
// recessive axis, and a native-title hover tooltip - no legend needed for a
// single series, no new charting dependency for what SRS Part 18.1 calls
// "a basic chart, no need for anything elaborate."
export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.orderCount));

  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {data.map((point) => {
          const heightPct = (point.orderCount / max) * 100;
          const label = new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${label}: ${point.orderCount} order${point.orderCount === 1 ? "" : "s"}`}>
              <div
                className="w-full min-h-[2px] rounded-t-sm bg-primary transition-all"
                style={{ height: `${Math.max(heightPct, point.orderCount > 0 ? 4 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] text-text-secondary">
        {data.map((point, i) => (
          <div key={point.date} className="flex-1 text-center">
            {i === 0 || i === data.length - 1
              ? new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
