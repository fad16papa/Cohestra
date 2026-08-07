import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const DASHBOARD_TABLE_VISIBLE_ROWS = 8;
export const DASHBOARD_TABLE_ROW_HEIGHT = "3rem";
export const DASHBOARD_TABLE_HEADER_HEIGHT = "2.75rem";

const tableScrollStyle = {
  "--dashboard-table-row-height": DASHBOARD_TABLE_ROW_HEIGHT,
  "--dashboard-table-header-height": DASHBOARD_TABLE_HEADER_HEIGHT,
  "--dashboard-table-visible-rows": DASHBOARD_TABLE_VISIBLE_ROWS,
} as CSSProperties;

type DashboardScrollTableProps = {
  children: ReactNode;
  footer?: ReactNode;
  itemCount: number;
  scrollAriaLabel: string;
  className?: string;
  visibleRows?: number;
};

export function DashboardScrollTable({
  children,
  footer,
  itemCount,
  scrollAriaLabel,
  className,
  visibleRows = DASHBOARD_TABLE_VISIBLE_ROWS,
}: DashboardScrollTableProps) {
  const hasMore = itemCount > visibleRows;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-warm bg-card/90",
        className
      )}
      style={{
        ...tableScrollStyle,
        "--dashboard-table-visible-rows": visibleRows,
      } as CSSProperties}
    >
      <div className="relative">
        <div
          className={cn(
            "max-h-[calc(var(--dashboard-table-header-height)+var(--dashboard-table-row-height)*var(--dashboard-table-visible-rows))]",
            "overflow-x-auto overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
            "touch-pan-y"
          )}
          tabIndex={hasMore ? 0 : undefined}
          aria-label={scrollAriaLabel}
        >
          {children}
        </div>
        {hasMore ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card via-card/85 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border-warm bg-muted/20 px-4 py-3 sm:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardScrollTableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-muted/40 text-xs uppercase tracking-wide text-text-muted-warm backdrop-blur-sm",
        className
      )}
    >
      {children}
    </thead>
  );
}
