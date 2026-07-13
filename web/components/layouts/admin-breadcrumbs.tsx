import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { AdminBreadcrumb } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type AdminBreadcrumbsProps = {
  items: AdminBreadcrumb[];
  className?: string;
};

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-text-muted-warm"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate text-text-muted-warm transition-colors hover:text-text-warm"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    isLast ? "font-medium text-text-warm" : "text-text-muted-warm"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
