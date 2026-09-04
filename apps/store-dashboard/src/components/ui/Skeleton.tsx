import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-sunken", className)} />;
}

export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className="h-4 w-full max-w-[10rem]" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
