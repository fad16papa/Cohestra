import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

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

  const origin = items.find((item) => item.href);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      {origin ? (
        <Link
          href={origin.href!}
          className="inline-flex min-h-11 min-w-11 items-center gap-2 text-sm font-medium text-text-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Back to {origin.label}</span>
        </Link>
      ) : null}
      <ol className={cn("min-w-0 flex-wrap items-center gap-1 text-sm", origin ? "hidden md:flex" : "flex")}>
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
                  className="truncate text-text-link underline-offset-4 motion-press hover:underline"
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
