import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { IntelligenceInsight } from "@/lib/intelligence-api";
import { cn } from "@/lib/utils";

type IntelligenceInsightCardProps = {
  insight: IntelligenceInsight;
  headingLevel?: "h2" | "h3";
  compact?: boolean;
};

export function IntelligenceInsightCard({
  insight,
  headingLevel = "h2",
  compact = false,
}: IntelligenceInsightCardProps) {
  const Heading = headingLevel;
  const actionHref = insight.recommendedAction.href;
  const disclosureId = `${insight.id}-evidence`;

  return (
    <article
      className={cn(
        "rounded-xl border border-border-warm bg-background/70",
        compact ? "p-4" : "p-4 sm:p-5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-text-muted-warm">
            Priority {insight.priority}
            <span className="sr-only">. Kind {insight.kind.replaceAll("_", " ")}</span>
          </p>
          <Heading className="break-words text-base font-medium text-text-warm">
            {insight.title}
          </Heading>
          <p className="text-sm leading-relaxed text-text-muted-warm">
            {insight.whyItMatters}
          </p>
          {insight.whatChanged ? (
            <p className="text-sm text-text-warm">{insight.whatChanged}</p>
          ) : null}
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-12 min-h-12 shrink-0 self-start px-4"
            )}
          >
            {insight.recommendedAction.label}
          </Link>
        ) : (
          <p
            className="max-w-xs shrink-0 self-start text-sm text-text-muted-warm"
            data-testid="unavailable-action"
          >
            Next action unavailable: {insight.recommendedAction.label} is not a
            safe workspace link.
          </p>
        )}
      </div>
      <details className="mt-3">
        <summary
          className="min-h-12 cursor-pointer py-2 text-sm text-text-link"
          aria-controls={disclosureId}
        >
          Why this is true
        </summary>
        <dl id={disclosureId} className="mt-2 space-y-1.5">
          {insight.evidence.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="flex flex-wrap gap-x-2 text-sm text-text-muted-warm"
            >
              <dt className="min-w-0">{item.label}</dt>
              <dd className="min-w-0 break-words font-medium text-text-warm">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.value}
                  </Link>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}
