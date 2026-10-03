"use client";

import { useRef } from "react";
import { BarChart3, LayoutGrid, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DASHBOARD_VIEW_MODE_OPTIONS,
  type DashboardViewMode,
} from "@/lib/dashboard-view-mode";

const VIEW_ICONS: Record<DashboardViewMode, typeof LayoutGrid> = {
  overview: LayoutGrid,
  graphs: BarChart3,
  table: Table2,
};

type DashboardViewSwitcherProps = {
  value: DashboardViewMode;
  onChange: (mode: DashboardViewMode) => void;
  className?: string;
};

export function DashboardViewSwitcher({
  value,
  onChange,
  className,
}: DashboardViewSwitcherProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  function focusTab(mode: DashboardViewMode) {
    tabListRef.current
      ?.querySelector<HTMLElement>(`#dashboard-view-${mode}`)
      ?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-warm">Dashboard view</p>
        <p className="text-xs text-text-muted-warm">
          {DASHBOARD_VIEW_MODE_OPTIONS.find((option) => option.value === value)?.description}
        </p>
      </div>

      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Dashboard view"
        className="inline-flex w-full min-w-0 rounded-xl border border-border-warm bg-muted/30 p-1 sm:w-auto"
      >
        {DASHBOARD_VIEW_MODE_OPTIONS.map((option, index) => {
          const Icon = VIEW_ICONS[option.value];
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              id={`dashboard-view-${option.value}`}
              aria-selected={isActive}
              aria-controls="dashboard-view-panel"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                  return;
                }
                event.preventDefault();
                const delta = event.key === "ArrowRight" ? 1 : -1;
                const next =
                  DASHBOARD_VIEW_MODE_OPTIONS[
                    (index + delta + DASHBOARD_VIEW_MODE_OPTIONS.length) %
                      DASHBOARD_VIEW_MODE_OPTIONS.length
                  ];
                onChange(next.value);
                requestAnimationFrame(() => focusTab(next.value));
              }}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium motion-local sm:flex-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-background text-text-warm shadow-sm"
                  : "text-text-muted-warm hover:bg-background/60 hover:text-text-warm"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
