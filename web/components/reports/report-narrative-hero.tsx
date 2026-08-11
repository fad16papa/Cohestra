"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { buildReportInsights } from "@/lib/report-insights";
import type { ReportResult } from "@/lib/reports-api";
import { cn } from "@/lib/utils";

type ReportNarrativeHeroProps = {
  report: ReportResult;
};

const toneStyles = {
  positive: "border-lagoon/30 bg-lagoon/[0.06]",
  neutral: "border-border-warm bg-muted/20",
  attention: "border-amber-300/50 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/20",
} as const;

function InsightActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="mt-2 inline-flex text-sm font-medium text-lagoon underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}

export function ReportNarrativeHero({ report }: ReportNarrativeHeroProps) {
  const insights = buildReportInsights(report);
  const heroInsight = insights[0];

  return (
    <section className="rounded-2xl border border-border-warm bg-card/90 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-lagoon/10 text-lagoon">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-section text-gold">Your report at a glance</p>
          <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-text-warm sm:text-2xl">
            {heroInsight?.headline ?? "Report ready"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted-warm">
            {heroInsight?.detail}
          </p>
          {heroInsight?.actionHref && heroInsight.actionLabel ? (
            <InsightActionLink href={heroInsight.actionHref} label={heroInsight.actionLabel} />
          ) : null}
        </div>
      </div>

      {insights.length > 1 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {insights.slice(1, 4).map((insight) => (
            <li
              key={insight.id}
              className={cn(
                "rounded-xl border px-4 py-3",
                toneStyles[insight.tone]
              )}
            >
              <p className="text-sm font-semibold text-text-warm">{insight.headline}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted-warm">
                {insight.detail}
              </p>
              {insight.actionHref && insight.actionLabel ? (
                <InsightActionLink href={insight.actionHref} label={insight.actionLabel} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
