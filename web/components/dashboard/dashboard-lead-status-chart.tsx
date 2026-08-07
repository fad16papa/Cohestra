"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  ChartTooltipFrame,
  DashboardChartCard,
} from "@/components/dashboard/dashboard-chart-card";
import type { DashboardLeadStatusBreakdown } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type StatusSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  href: string;
};

type DashboardLeadStatusChartProps = {
  breakdown: DashboardLeadStatusBreakdown;
  className?: string;
  /** Stretch chart + legend to fill the card body (graphs view). */
  fill?: boolean;
};

function buildSlices(breakdown: DashboardLeadStatusBreakdown): StatusSlice[] {
  return [
    {
      key: "new",
      label: "New",
      value: breakdown.newCount,
      color: "var(--status-new)",
      href: "/clients?leadStatus=new",
    },
    {
      key: "contacted",
      label: "Contacted",
      value: breakdown.contactedCount,
      color: "var(--status-contacted)",
      href: "/clients?leadStatus=contacted",
    },
    {
      key: "active",
      label: "Active",
      value: breakdown.activeCount,
      color: "var(--status-active)",
      href: "/clients?leadStatus=active",
    },
    {
      key: "inactive",
      label: "Inactive",
      value: breakdown.inactiveCount,
      color: "var(--status-inactive)",
      href: "/clients?leadStatus=inactive",
    },
  ];
}

function formatSharePercent(value: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  const percent = (value / total) * 100;
  return `${percent >= 10 || Number.isInteger(percent) ? Math.round(percent) : percent.toFixed(1)}%`;
}

type StatusTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: StatusSlice & { total: number } }>;
};

function StatusTooltip({ active, payload }: StatusTooltipProps) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) {
    return null;
  }

  return (
    <ChartTooltipFrame
      title={slice.label}
      rows={[
        { label: "Clients", value: String(slice.value), color: slice.color },
        { label: "Share", value: formatSharePercent(slice.value, slice.total) },
      ]}
    />
  );
}

export function DashboardLeadStatusChart({
  breakdown,
  className,
  fill = false,
}: DashboardLeadStatusChartProps) {
  const slices = useMemo(() => buildSlices(breakdown), [breakdown]);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const chartData = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => ({ ...slice, total }));

  return (
    <DashboardChartCard
      headingId="dashboard-lead-status-heading"
      title="Lead pipeline"
      description="Client list by lead status — tap a status to open that segment."
      className={className}
      contentClassName={fill ? "min-h-0" : undefined}
    >
      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No clients yet. Your lead pipeline appears here after the first registration.
        </p>
      ) : (
        <div
          className={cn(
            fill
              ? "grid min-h-[min(22rem,52vh)] flex-1 grid-cols-1 gap-6 sm:grid-cols-2 sm:items-stretch"
              : "flex flex-col items-center gap-5 sm:flex-row sm:items-center"
          )}
        >
          <div
            className={cn(
              "relative w-full",
              fill
                ? "min-h-[14rem] sm:min-h-0 sm:h-full"
                : "h-44 w-44 shrink-0"
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<StatusTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={fill ? "58%" : 56}
                  outerRadius={fill ? "88%" : 82}
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  strokeWidth={0}
                >
                  {chartData.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "tabular-nums font-semibold text-text-warm",
                  fill ? "text-3xl sm:text-4xl" : "text-2xl"
                )}
              >
                {total}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
                Clients
              </span>
            </div>
          </div>

          <ul
            className={cn(
              "w-full space-y-2",
              fill && "flex h-full flex-col justify-center gap-2 sm:gap-3"
            )}
          >
            {slices.map((slice) => (
              <li key={slice.key}>
                <Link
                  href={slice.href}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    fill ? "py-2.5 sm:px-3 sm:py-3" : "py-1.5"
                  )}
                  aria-label={`View ${slice.value} ${slice.label.toLowerCase()} clients`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-text-warm">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block shrink-0 rounded-full",
                        fill ? "size-3" : "size-2.5"
                      )}
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate group-hover:text-primary">{slice.label}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span
                      className={cn(
                        "tabular-nums font-semibold text-text-warm",
                        fill ? "text-base" : "text-sm"
                      )}
                    >
                      {slice.value}
                    </span>
                    <span className="w-11 text-right tabular-nums text-xs text-text-muted-warm">
                      {formatSharePercent(slice.value, total)}
                    </span>
                  </span>
                </Link>
                {fill ? (
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50 sm:mt-2"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: formatSharePercent(slice.value, total),
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardChartCard>
  );
}
