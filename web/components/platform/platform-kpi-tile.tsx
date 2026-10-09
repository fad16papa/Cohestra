import type { ReactNode } from "react";

import type { PlatformKpiFreshness } from "@/lib/platform-api";
import { freshnessLabel, observedLabel } from "@/lib/platform-overview";

type PlatformKpiTileProps = {
  title: string;
  children: ReactNode;
  source: string;
  observedAt: string;
  freshness: PlatformKpiFreshness;
};

export function PlatformKpiTile({
  title,
  children,
  source,
  observedAt,
  freshness,
}: PlatformKpiTileProps) {
  const freshnessText = freshnessLabel(freshness);
  return (
    <section className="rounded-[10px] border border-[var(--plat-line)] bg-white/70 p-4 sm:p-5">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--plat-ink)]">{title}</h2>
      <div className="mt-3 text-[var(--plat-ink)]">{children}</div>
      <p className="mt-4 text-xs leading-relaxed text-[var(--plat-stone)]">
        <span className="font-medium text-[var(--plat-ink)]">{freshnessText}</span>
        <span aria-hidden> · </span>
        <span>{source}</span>
        <span aria-hidden> · </span>
        <time dateTime={observedAt}>{observedLabel(observedAt)}</time>
      </p>
    </section>
  );
}
