import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const DASHBOARD_PANEL_VISIBLE_ITEMS = 5;
export const DASHBOARD_PANEL_ROW_HEIGHT = "4.5rem";

const panelStyle = {
  "--dashboard-panel-row-height": DASHBOARD_PANEL_ROW_HEIGHT,
  "--dashboard-panel-visible-items": DASHBOARD_PANEL_VISIBLE_ITEMS,
} as CSSProperties;

type DashboardMatchedPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  itemCount: number;
  scrollAriaLabel: string;
  className?: string;
};

export function DashboardMatchedPanel({
  children,
  footer,
  itemCount,
  scrollAriaLabel,
  className,
}: DashboardMatchedPanelProps) {
  const hasMore = itemCount > DASHBOARD_PANEL_VISIBLE_ITEMS;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border-warm bg-card/80 shadow-sm backdrop-blur-sm",
        className
      )}
      style={panelStyle}
    >
      <div className="relative">
        <div
          className={cn(
            "max-h-[calc(var(--dashboard-panel-row-height)*var(--dashboard-panel-visible-items))]",
            "overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
            "touch-pan-y"
          )}
          tabIndex={hasMore ? 0 : undefined}
          aria-label={scrollAriaLabel}
        >
          {children}
        </div>
        {hasMore ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card via-card/80 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border-warm bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardPanelSection({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("flex min-h-0 flex-col gap-4", className)} {...props}>
      {children}
    </section>
  );
}

export function DashboardPanelHeader({
  headingId,
  title,
  description,
  action,
}: {
  headingId: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 id={headingId} className="text-section text-text-warm">
          {title}
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
