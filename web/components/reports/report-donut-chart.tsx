"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { formatSharePercent } from "@/components/reports/report-visual-primitives";
import { cn } from "@/lib/utils";

export type ReportDonutSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type ReportDonutChartProps = {
  slices: ReportDonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: "md" | "lg";
  emptyMessage?: string;
};

type ActiveSlice = ReportDonutSlice & { total: number };

export function ReportDonutChart({
  slices,
  centerValue,
  centerLabel,
  size = "md",
  emptyMessage = "No data yet.",
}: ReportDonutChartProps) {
  const [activeSlice, setActiveSlice] = useState<ActiveSlice | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const chartData = slices.filter((slice) => slice.value > 0).map((slice) => ({ ...slice, total }));
  const dimension = size === "lg" ? "h-52 w-52" : "h-40 w-40";
  const valueClass = size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl";

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-warm px-4 py-8 text-center text-sm text-text-muted-warm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`relative mx-auto shrink-0 ${dimension}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius="54%"
            outerRadius="88%"
            paddingAngle={chartData.length > 1 ? 2 : 0}
            strokeWidth={0}
            onMouseEnter={(_data, index) => {
              const slice = chartData[index];
              if (slice) {
                setActiveSlice(slice);
              }
            }}
            onMouseLeave={() => setActiveSlice(null)}
          >
            {chartData.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-3 text-center">
        {activeSlice ? (
          <>
            <span
              className="line-clamp-2 text-[11px] font-semibold leading-snug text-text-warm"
              title={activeSlice.label}
            >
              {activeSlice.label}
            </span>
            <span className={cn("mt-1 tabular-nums font-semibold text-text-warm", valueClass)}>
              {activeSlice.value}
            </span>
            <span className="mt-0.5 text-[11px] uppercase tracking-wide text-text-muted-warm">
              {formatSharePercent(activeSlice.value, activeSlice.total)} share
            </span>
          </>
        ) : (
          <>
            <span className={cn("tabular-nums font-semibold text-text-warm", valueClass)}>
              {centerValue}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-text-muted-warm">
              {centerLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
