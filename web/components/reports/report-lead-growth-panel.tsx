"use client";

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
import type { ReportResult } from "@/lib/reports-api";

type ReportLeadGrowthPanelProps = {
  report: ReportResult;
};

type GrowthBarItem = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type GrowthTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: GrowthBarItem & { total: number } }>;
};

function GrowthTooltip({ active, payload }: GrowthTooltipProps) {
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

export function ReportLeadGrowthPanel({ report }: ReportLeadGrowthPanelProps) {
  const cohortTotal = report.leadGrowth.totalLeadsAtEnd;
  const newLeads = report.leadGrowth.newLeadsInPeriod;
  const existing = report.leadGrowth.totalLeadsBeforePeriod;
  const repeat = report.repeatParticipants;
  const inactive = report.inactiveClients;

  const retentionRate =
    cohortTotal > 0 ? Math.round((repeat / cohortTotal) * 100) : 0;

  const compositionSlices = [
    { id: "new", label: "New in period", value: newLeads, color: "var(--chart-1)" },
    { id: "existing", label: "Existing clients", value: existing, color: "var(--chart-2)" },
  ].filter((slice) => slice.value > 0);

  const engagementBars: GrowthBarItem[] = [
    { id: "repeat", label: "Repeat", value: repeat, color: "var(--chart-1)" },
    { id: "inactive", label: "Inactive", value: inactive, color: "var(--chart-4)" },
    { id: "new", label: "New leads", value: newLeads, color: "var(--chart-2)" },
  ].filter((item) => item.value > 0);

  const barData = engagementBars.map((item) => ({ ...item, total: cohortTotal }));

  return (
    <ReportDepthCard accent="gold" className="flex h-full flex-col overflow-hidden">
      <ReportPanelHeader
        title="Lead growth"
        description="Cohort makeup and engagement — new vs returning, plus repeat and inactive signals."
        aside={
          <p className="text-right text-sm font-semibold tabular-nums text-text-warm">
            {cohortTotal} clients
          </p>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {cohortTotal === 0 ? (
          <p className="text-sm text-text-muted-warm">No clients in this cohort yet.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
              <ReportDonutChart
                slices={compositionSlices}
                centerValue={String(cohortTotal)}
                centerLabel="In cohort"
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
                    <Tooltip content={<GrowthTooltip />} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 border-t border-border-warm/70 pt-4">
              <div className="rounded-lg border border-border-warm/70 bg-lagoon/[0.05] px-3 py-2.5">
                <dt className="text-xs text-text-muted-warm">New in period</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-text-warm">
                  {newLeads}
                  <span className="ml-1 text-xs font-normal text-text-muted-warm">
                    ({formatSharePercent(newLeads, cohortTotal)})
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-border-warm/70 bg-muted/20 px-3 py-2.5">
                <dt className="text-xs text-text-muted-warm">Existing clients</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-text-warm">
                  {existing}
                  <span className="ml-1 text-xs font-normal text-text-muted-warm">
                    ({formatSharePercent(existing, cohortTotal)})
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-border-warm/70 bg-lagoon/[0.05] px-3 py-2.5">
                <dt className="text-xs text-text-muted-warm">Repeat participants</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-text-warm">
                  {repeat}
                  <span className="ml-1 text-xs font-normal text-lagoon">
                    {retentionRate}% returned
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-border-warm/70 bg-amber-50/50 px-3 py-2.5 dark:bg-amber-950/20">
                <dt className="text-xs text-text-muted-warm">Inactive in cohort</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-text-warm">
                  {inactive}
                  <span className="ml-1 text-xs font-normal text-text-muted-warm">
                    re-engage
                  </span>
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </ReportDepthCard>
  );
}
