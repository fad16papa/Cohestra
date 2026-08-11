"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltipFrame } from "@/components/dashboard/dashboard-chart-card";
import { ReportDonutChart } from "@/components/reports/report-donut-chart";
import {
  formatSharePercent,
  ReportDepthCard,
  ReportPanelHeader,
} from "@/components/reports/report-visual-primitives";
import type { ReportFollowUpStatus } from "@/lib/reports-api";

type ReportFollowUpChartProps = {
  followUpStatus: ReportFollowUpStatus;
};

type StatusSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  href: string;
};

function buildSlices(followUpStatus: ReportFollowUpStatus): StatusSlice[] {
  return [
    {
      key: "new",
      label: "New",
      value: followUpStatus.newCount,
      color: "var(--status-new)",
      href: "/clients?leadStatus=new",
    },
    {
      key: "contacted",
      label: "Contacted",
      value: followUpStatus.contactedCount,
      color: "var(--status-contacted)",
      href: "/clients?leadStatus=contacted",
    },
    {
      key: "active",
      label: "Active",
      value: followUpStatus.activeCount,
      color: "var(--status-active)",
      href: "/clients?leadStatus=active",
    },
    {
      key: "inactive",
      label: "Inactive",
      value: followUpStatus.inactiveCount,
      color: "var(--status-inactive)",
      href: "/clients?leadStatus=inactive",
    },
  ];
}

type BarTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: StatusSlice & { total: number } }>;
};

function BarTooltip({ active, payload }: BarTooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) {
    return null;
  }

  return (
    <ChartTooltipFrame
      title={row.label}
      rows={[
        { label: "Clients", value: String(row.value), color: row.color },
        { label: "Share", value: formatSharePercent(row.value, row.total) },
      ]}
    />
  );
}

export function ReportFollowUpChart({ followUpStatus }: ReportFollowUpChartProps) {
  const slices = buildSlices(followUpStatus);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const coverageLabel = `${Number.isInteger(followUpStatus.coveragePercent) ? followUpStatus.coveragePercent : followUpStatus.coveragePercent.toFixed(1)}%`;

  const barData = slices.map((slice) => ({ ...slice, total }));

  return (
    <ReportDepthCard accent="neutral" className="flex h-full flex-col overflow-hidden">
      <ReportPanelHeader
        title="Follow-up pipeline"
        description="Lead status mix for this cohort — coverage shows who has been contacted or progressed."
        aside={
          <p className="text-right text-sm font-semibold tabular-nums text-text-warm">
            {total} clients
          </p>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {total === 0 ? (
          <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
            No clients in this cohort yet.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
              <ReportDonutChart
                slices={slices.map((slice) => ({
                  id: slice.key,
                  label: slice.label,
                  value: slice.value,
                  color: slice.color,
                }))}
                centerValue={coverageLabel}
                centerLabel="Coverage"
                size="md"
              />
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid
                      stroke="var(--border-warm)"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border-warm)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((item) => (
                        <Cell key={item.key} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <ul className="divide-y divide-border-warm/70 border-t border-border-warm/70">
              {slices.map((slice) => (
                <li key={slice.key}>
                  <Link
                    href={slice.href}
                    className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/25"
                  >
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-warm group-hover:text-lagoon">
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

            {followUpStatus.newCount > 0 ? (
              <p className="rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {followUpStatus.newCount} client{followUpStatus.newCount === 1 ? "" : "s"} still
                marked New — open the list to start follow-up.
              </p>
            ) : null}
          </>
        )}
      </div>
    </ReportDepthCard>
  );
}
