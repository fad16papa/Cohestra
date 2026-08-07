"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartTooltipFrame,
  DashboardChartCard,
  formatChartDate,
} from "@/components/dashboard/dashboard-chart-card";
import type { DashboardTrendPoint } from "@/lib/dashboard-api";

const REGISTRATIONS_COLOR = "var(--chart-1)";
const NEW_CLIENTS_COLOR = "var(--chart-4)";

type DashboardRegistrationsTrendChartProps = {
  points: DashboardTrendPoint[];
  trendDays: number;
  className?: string;
  compact?: boolean;
};

type TrendTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ dataKey?: string; value?: number }>;
};

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
  if (!active || !label || !payload?.length) {
    return null;
  }

  const registrations = payload.find((item) => item.dataKey === "registrations");
  const newClients = payload.find((item) => item.dataKey === "newClients");

  return (
    <ChartTooltipFrame
      title={formatChartDate(label)}
      rows={[
        {
          label: "Registrations",
          value: String(registrations?.value ?? 0),
          color: REGISTRATIONS_COLOR,
        },
        {
          label: "New clients",
          value: String(newClients?.value ?? 0),
          color: NEW_CLIENTS_COLOR,
        },
      ]}
    />
  );
}

export function DashboardRegistrationsTrendChart({
  points,
  trendDays,
  className,
  compact = false,
}: DashboardRegistrationsTrendChartProps) {
  const gradientIdBase = useId().replace(/:/g, "");
  const registrationsGradientId = `${gradientIdBase}-registrations`;
  const clientsGradientId = `${gradientIdBase}-clients`;

  const totals = useMemo(
    () =>
      points.reduce(
        (acc, point) => ({
          registrations: acc.registrations + point.registrations,
          newClients: acc.newClients + point.newClients,
        }),
        { registrations: 0, newClients: 0 }
      ),
    [points]
  );

  const hasData = points.some(
    (point) => point.registrations > 0 || point.newClients > 0
  );

  const rangeLabel = trendDays > 0 ? `last ${trendDays} days` : "recent period";

  return (
    <DashboardChartCard
      headingId="dashboard-registrations-trend-heading"
      title="Registrations trend"
      description={`Daily registrations and first-time clients, ${rangeLabel} (UTC).`}
      className={className}
      headerAside={
        <dl className="flex items-center gap-4 text-right">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-text-muted-warm">
              Registrations
            </dt>
            <dd className="tabular-nums text-lg font-semibold text-text-warm">
              {totals.registrations}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-text-muted-warm">
              New clients
            </dt>
            <dd className="tabular-nums text-lg font-semibold text-text-warm">
              {totals.newClients}
            </dd>
          </div>
        </dl>
      }
    >
      {!hasData ? (
        <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations in the {rangeLabel} yet. New sign-ups will chart here daily.
        </p>
      ) : (
        <div style={{ height: compact ? 200 : 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <defs>
                <linearGradient id={registrationsGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REGISTRATIONS_COLOR} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={REGISTRATIONS_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={clientsGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEW_CLIENTS_COLOR} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={NEW_CLIENTS_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--border-warm)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-warm)" }}
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--text-muted-warm)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: "var(--border-warm)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke={REGISTRATIONS_COLOR}
                strokeWidth={2}
                fill={`url(#${registrationsGradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="newClients"
                name="New clients"
                stroke={NEW_CLIENTS_COLOR}
                strokeWidth={2}
                fill={`url(#${clientsGradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-muted-warm">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ backgroundColor: REGISTRATIONS_COLOR }}
          />
          Registrations
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ backgroundColor: NEW_CLIENTS_COLOR }}
          />
          New clients
        </span>
      </div>
    </DashboardChartCard>
  );
}
