import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={item.label}>
            {i > 0 && <ChevronRight size={14} className="text-text-disabled" aria-hidden="true" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="text-text-secondary transition-colors hover:text-text-primary">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-text-primary" : "text-text-secondary"} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
