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
  /** Graphs view: stacked chart on top, compact details below. */
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
      contentClassName={fill ? "min-h-0 gap-0 p-0 sm:p-0" : undefined}
    >
      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No clients yet. Your lead pipeline appears here after the first registration.
        </p>
      ) : fill ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-[13rem] flex-1 px-4 pt-2 sm:min-h-[15rem] sm:px-5 sm:pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<StatusTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="52%"
                  outerRadius="92%"
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
              <span className="tabular-nums text-4xl font-semibold text-text-warm sm:text-[2.75rem]">
                {total}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
                Clients
              </span>
            </div>
          </div>

          <ul className="shrink-0 divide-y divide-border-warm/70 border-t border-border-warm/70">
            {slices.map((slice) => (
              <li key={slice.key}>
                <Link
                  href={slice.href}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                  aria-label={`View ${slice.value} ${slice.label.toLowerCase()} clients`}
                >
                  <span
                    aria-hidden
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-warm group-hover:text-primary">
                    {slice.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-sm font-semibold text-text-warm">
                    {slice.value}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-xs text-text-muted-warm">
                    {formatSharePercent(slice.value, total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<StatusTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={82}
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
              <span className="tabular-nums text-2xl font-semibold text-text-warm">
                {total}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
                Clients
              </span>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {slices.map((slice) => (
              <li key={slice.key}>
                <Link
                  href={slice.href}
                  className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View ${slice.value} ${slice.label.toLowerCase()} clients`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-text-warm">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate group-hover:text-primary">{slice.label}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="tabular-nums text-sm font-semibold text-text-warm">
                      {slice.value}
                    </span>
                    <span className="w-11 text-right tabular-nums text-xs text-text-muted-warm">
                      {formatSharePercent(slice.value, total)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardChartCard>
  );
}
