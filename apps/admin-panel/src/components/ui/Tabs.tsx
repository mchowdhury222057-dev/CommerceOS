import { cn } from "../../lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-sunken p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-surface-card text-primary shadow-card" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
