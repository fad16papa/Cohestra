"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
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

import {
  ChartTooltipFrame,
  DashboardChartCard,
} from "@/components/dashboard/dashboard-chart-card";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";

const BAR_COLOR = "var(--chart-1)";
const BAR_COLOR_MUTED = "var(--chart-3)";
const MAX_BARS = 10;

type DashboardActivityPerformanceGraphProps = {
  items: ActivityPerformanceItem[];
  periodLabel: string;
  className?: string;
};

type BarDatum = {
  activityId: string;
  name: string;
  fullName: string;
  communityLabel: string;
  registrations: number;
  share: number;
};

function truncateLabel(value: string, max = 22): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

type BarTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: BarDatum }>;
};

function BarTooltip({ active, payload }: BarTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <ChartTooltipFrame
      title={datum.fullName}
      rows={[
        { label: "Registrations", value: String(datum.registrations), color: BAR_COLOR },
        { label: "Share", value: `${datum.share.toFixed(1)}%` },
        ...(datum.communityLabel
          ? [{ label: "Community", value: datum.communityLabel }]
          : []),
      ]}
    />
  );
}

export function DashboardActivityPerformanceGraph({
  items,
  periodLabel,
  className,
}: DashboardActivityPerformanceGraphProps) {
  const router = useRouter();

  const data = useMemo<BarDatum[]>(() => {
    const totalRegistrations = items.reduce(
      (sum, item) => sum + item.registrationCount,
      0
    );

    return items.slice(0, MAX_BARS).map((item) => ({
      activityId: item.activityId,
      name: truncateLabel(item.activityName),
      fullName: item.activityName,
      communityLabel: item.communityLabel,
      registrations: item.registrationCount,
      share:
        totalRegistrations === 0
          ? 0
          : (item.registrationCount / totalRegistrations) * 100,
    }));
  }, [items]);

  const chartHeight = Math.max(180, data.length * 40 + 40);

  return (
    <DashboardChartCard
      headingId="activity-performance-graph-heading"
      title="Activity performance"
      description={`Registration volume by activity for ${periodLabel} — click a bar to open the activity.`}
      className={className}
    >
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations {periodLabel} yet. Publish an activity to populate this chart.
        </p>
      ) : (
        <>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 32, bottom: 0, left: 8 }}
                barCategoryGap="26%"
              >
                <CartesianGrid
                  stroke="var(--border-warm)"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-warm)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fill: "var(--text-warm)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<BarTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                />
                <Bar
                  dataKey="registrations"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                  className="cursor-pointer"
                  onClick={(datum) => {
                    const activityId = (datum as unknown as BarDatum).activityId;
                    if (activityId) {
                      router.push(`/activities/${activityId}`);
                    }
                  }}
                  label={{
                    position: "right",
                    fill: "var(--text-warm)",
                    fontSize: 12,
                  }}
                >
                  {data.map((datum, index) => (
                    <Cell
                      key={datum.activityId}
                      fill={index === 0 ? BAR_COLOR : BAR_COLOR_MUTED}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {items.length > data.length ? (
            <p className="mt-2 text-xs text-text-muted-warm">
              Showing top {data.length} of {items.length} activities by registrations.
            </p>
          ) : null}
        </>
      )}
    </DashboardChartCard>
  );
}
