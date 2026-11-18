"use client";

import { area, curveMonotoneX, line } from "d3-shape";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

const REGISTRATIONS_COLOR = "var(--chart-1)";
const NEW_CLIENTS_COLOR = "var(--chart-4)";

const FALLBACK_VIEW_WIDTH = 400;
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: -18 };
const Y_AXIS_WIDTH = 42;

type DashboardRegistrationsTrendChartProps = {
  points: DashboardTrendPoint[];
  trendDays: number;
  className?: string;
  compact?: boolean;
  /** Override default “(UTC)” range copy — e.g. cinema Asia/Singapore world. */
  rangeTimeZoneLabel?: string;
  headingId?: string;
  /** When true, render AreaChart at width/height 100% without ResponsiveContainer (first-paint SSR). */
  cssResponsive?: boolean;
  /** When set, passes isAnimationActive to Area series (hero uses false; dashboard omits for reduced-motion default). */
  animate?: boolean;
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

function niceYMax(maxValue: number): number {
  if (maxValue <= 0) {
    return 4;
  }
  const step = maxValue <= 4 ? 1 : maxValue <= 12 ? 3 : 5;
  return Math.ceil(maxValue / step) * step;
}

function yTickValues(yMax: number): number[] {
  const step = yMax <= 4 ? 1 : yMax <= 12 ? 3 : 5;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(v);
  }
  return ticks;
}

function fallbackXTicks(points: DashboardTrendPoint[]): number[] {
  if (points.length <= 1) {
    return [0];
  }
  const count = Math.min(5, points.length);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (points.length - 1));
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  return indices;
}

type RegistrationsTrendSsrFallbackProps = {
  points: DashboardTrendPoint[];
  plotHeight: number;
};

/** Synchronous plot for hero SSR / hydration before recharts measures the container. */
function RegistrationsTrendSsrFallback({
  points,
  plotHeight,
}: RegistrationsTrendSsrFallbackProps) {
  const layout = useMemo(() => {
    const plotLeft = Y_AXIS_WIDTH + CHART_MARGIN.left;
    const plotRight = FALLBACK_VIEW_WIDTH - CHART_MARGIN.right;
    const plotTop = CHART_MARGIN.top;
    const plotBottom = plotHeight - 22;
    const plotWidth = Math.max(1, plotRight - plotLeft);
    const plotInnerHeight = Math.max(1, plotBottom - plotTop);

    const dataMax = points.reduce(
      (max, point) => Math.max(max, point.registrations, point.newClients),
      0
    );
    const yMax = niceYMax(dataMax);
    const yTicks = yTickValues(yMax);
    const xTickIndices = fallbackXTicks(points);

    const xAt = (index: number) =>
      plotLeft + (index / Math.max(1, points.length - 1)) * plotWidth;
    const yAt = (value: number) => plotBottom - (value / yMax) * plotInnerHeight;

    const registrationsLine = line<DashboardTrendPoint>()
      .x((_, index) => xAt(index))
      .y((point) => yAt(point.registrations))
      .curve(curveMonotoneX)(points);
    const newClientsLine = line<DashboardTrendPoint>()
      .x((_, index) => xAt(index))
      .y((point) => yAt(point.newClients))
      .curve(curveMonotoneX)(points);

    const registrationsArea = area<DashboardTrendPoint>()
      .x((_, index) => xAt(index))
      .y0(plotBottom)
      .y1((point) => yAt(point.registrations))
      .curve(curveMonotoneX)(points);
    const newClientsArea = area<DashboardTrendPoint>()
      .x((_, index) => xAt(index))
      .y0(plotBottom)
      .y1((point) => yAt(point.newClients))
      .curve(curveMonotoneX)(points);

    return {
      plotLeft,
      plotBottom,
      plotWidth,
      yTicks,
      xTickIndices,
      xAt,
      yAt,
      registrationsLine,
      newClientsLine,
      registrationsArea,
      newClientsArea,
    };
  }, [points, plotHeight]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${FALLBACK_VIEW_WIDTH} ${plotHeight}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
    >
      {layout.yTicks.map((tick) => {
        const y = layout.yAt(tick);
        return (
          <g key={tick}>
            <line
              x1={layout.plotLeft}
              x2={layout.plotLeft + layout.plotWidth}
              y1={y}
              y2={y}
              stroke="var(--border-warm)"
              strokeDasharray="4 4"
            />
            <text
              x={layout.plotLeft - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-muted-warm)"
              fontSize={11}
            >
              {tick}
            </text>
          </g>
        );
      })}
      {layout.xTickIndices.map((index) => (
        <text
          key={points[index].date}
          x={layout.xAt(index)}
          y={plotHeight - 6}
          textAnchor="middle"
          fill="var(--text-muted-warm)"
          fontSize={11}
        >
          {formatChartDate(points[index].date)}
        </text>
      ))}
      {layout.registrationsArea ? (
        <path d={layout.registrationsArea} fill={REGISTRATIONS_COLOR} fillOpacity={0.12} />
      ) : null}
      {layout.newClientsArea ? (
        <path d={layout.newClientsArea} fill={NEW_CLIENTS_COLOR} fillOpacity={0.1} />
      ) : null}
      {layout.registrationsLine ? (
        <path
          d={layout.registrationsLine}
          fill="none"
          stroke={REGISTRATIONS_COLOR}
          strokeWidth={2}
        />
      ) : null}
      {layout.newClientsLine ? (
        <path
          d={layout.newClientsLine}
          fill="none"
          stroke={NEW_CLIENTS_COLOR}
          strokeWidth={2}
        />
      ) : null}
    </svg>
  );
}

export function DashboardRegistrationsTrendChart({
  points,
  trendDays,
  className,
  compact = false,
  rangeTimeZoneLabel = "UTC",
  headingId = "dashboard-registrations-trend-heading",
  cssResponsive = false,
  animate,
}: DashboardRegistrationsTrendChartProps) {
  const gradientIdBase = useId().replace(/:/g, "");
  const registrationsGradientId = `${gradientIdBase}-registrations`;
  const clientsGradientId = `${gradientIdBase}-clients`;
  const plotRef = useRef<HTMLDivElement>(null);
  const [showSsrFallback, setShowSsrFallback] = useState(true);

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

  const chartHeight = compact ? 200 : 260;
  const areaSeriesProps =
    typeof animate === "boolean" ? { isAnimationActive: animate } : undefined;

  const cssResponsiveChartProps = cssResponsive
    ? ({ width: "100%", height: "100%", responsive: true } as const)
    : {};

  useEffect(() => {
    if (!cssResponsive || !hasData) {
      return;
    }
    const root = plotRef.current;
    if (!root) {
      return;
    }

    const hideWhenRechartsReady = () => {
      if (root.querySelector(".recharts-surface")) {
        setShowSsrFallback(false);
        return true;
      }
      return false;
    };

    if (hideWhenRechartsReady()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (hideWhenRechartsReady()) {
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [cssResponsive, hasData]);

  const areaChart = (
    <AreaChart
      data={points}
      margin={CHART_MARGIN}
      {...cssResponsiveChartProps}
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
        width={Y_AXIS_WIDTH}
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
        {...areaSeriesProps}
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
        {...areaSeriesProps}
      />
    </AreaChart>
  );

  return (
    <DashboardChartCard
      headingId={headingId}
      title="Registrations trend"
      description={`Daily registrations and first-time clients, ${rangeLabel} (${rangeTimeZoneLabel}).`}
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
      ) : cssResponsive ? (
        <div
          ref={plotRef}
          className="relative w-full min-w-0 overflow-hidden"
          style={{ height: chartHeight }}
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0",
              !showSsrFallback && "invisible"
            )}
          >
            <RegistrationsTrendSsrFallback points={points} plotHeight={chartHeight} />
          </div>
          <div className="absolute inset-0">{areaChart}</div>
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-hidden" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            {areaChart}
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