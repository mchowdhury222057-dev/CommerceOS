import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border-default px-4 py-3 sm:flex-row">
      <p className="text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{start}</span>–<span className="font-medium text-text-primary">{end}</span> of{" "}
        <span className="font-medium text-text-primary">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden="true" />
        </PageButton>
        <span className="px-3 text-xs font-medium text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} aria-hidden="true" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...rest}
    />
  );
}
