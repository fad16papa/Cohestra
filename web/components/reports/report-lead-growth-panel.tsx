"use client";

import { RefreshCw, UserMinus, UserPlus, Users } from "lucide-react";

import {
  formatSharePercent,
  ReportDepthCard,
  ReportPanelHeader,
  ReportShareBar,
} from "@/components/reports/report-visual-primitives";
import type { ReportResult } from "@/lib/reports-api";
import { cn } from "@/lib/utils";

type ReportLeadGrowthPanelProps = {
  report: ReportResult;
};

type CohortSegment = {
  id: string;
  label: string;
  value: number;
  colorClass: string;
  icon: typeof UserPlus;
};

export function ReportLeadGrowthPanel({ report }: ReportLeadGrowthPanelProps) {
  const cohortTotal = report.leadGrowth.totalLeadsAtEnd;
  const newLeads = report.leadGrowth.newLeadsInPeriod;
  const existing = report.leadGrowth.totalLeadsBeforePeriod;
  const repeat = report.repeatParticipants;
  const inactive = report.inactiveClients;

  const retentionRate =
    cohortTotal > 0 ? Math.round((repeat / cohortTotal) * 100) : 0;

  const segments: CohortSegment[] = [
    {
      id: "new",
      label: "New in period",
      value: newLeads,
      colorClass: "bg-lagoon",
      icon: UserPlus,
    },
    {
      id: "existing",
      label: "Existing clients",
      value: existing,
      colorClass: "bg-teal-600/80",
      icon: Users,
    },
  ].filter((segment) => segment.value > 0);

  const statCards = [
    {
      label: "Repeat participants",
      value: repeat,
      hint: `${retentionRate}% of cohort came back`,
      icon: RefreshCw,
      tone: "text-lagoon bg-lagoon/10",
    },
    {
      label: "Inactive in cohort",
      value: inactive,
      hint: "May need re-engagement",
      icon: UserMinus,
      tone: "text-amber-800 bg-amber-100/80 dark:text-amber-100 dark:bg-amber-950/30",
    },
  ];

  return (
    <ReportDepthCard accent="gold" className="overflow-hidden">
      <ReportPanelHeader
        title="Lead growth"
        description="Who joined this cohort and how they compare to your existing client base."
        aside={
          <p className="text-right text-sm font-semibold tabular-nums text-text-warm">
            {cohortTotal} clients
          </p>
        }
      />

      <div className="space-y-5 p-4 sm:p-5">
        {cohortTotal === 0 ? (
          <p className="text-sm text-text-muted-warm">No clients in this cohort yet.</p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                Cohort composition
              </p>
              <div
                className="flex h-4 overflow-hidden rounded-full bg-muted/40 shadow-inner"
                role="img"
                aria-label={`Cohort composition: ${newLeads} new, ${existing} existing`}
              >
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn(
                      "h-full bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
                      segment.id === "new" ? "from-lagoon to-lagoon/70" : "from-teal-600/90 to-teal-700/70"
                    )}
                    style={{
                      width: `${cohortTotal > 0 ? (segment.value / cohortTotal) * 100 : 0}%`,
                    }}
                    title={`${segment.label}: ${segment.value}`}
                  />
                ))}
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {segments.map((segment) => {
                  const Icon = segment.icon;
                  return (
                    <li
                      key={segment.id}
                      className="flex items-center gap-3 rounded-lg border border-border-warm/70 bg-muted/15 px-3 py-2.5"
                    >
                      <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", segment.id === "new" ? "bg-lagoon/10 text-lagoon" : "bg-teal-600/10 text-teal-700 dark:text-teal-300")}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-muted-warm">{segment.label}</p>
                        <p className="text-sm font-semibold tabular-nums text-text-warm">
                          {segment.value}{" "}
                          <span className="font-normal text-text-muted-warm">
                            ({formatSharePercent(segment.value, cohortTotal)})
                          </span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-border-warm/80 bg-gradient-to-br from-card to-muted/25 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", card.tone)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <p className="text-2xl font-semibold tabular-nums text-text-warm">
                        {card.value}
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-text-warm">{card.label}</p>
                    <p className="mt-0.5 text-xs text-text-muted-warm">{card.hint}</p>
                    <div className="mt-3">
                      <ReportShareBar
                        percent={cohortTotal > 0 ? (card.value / cohortTotal) * 100 : 0}
                        tone={card.label.includes("Repeat") ? "lagoon" : "muted"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ReportDepthCard>
  );
}
