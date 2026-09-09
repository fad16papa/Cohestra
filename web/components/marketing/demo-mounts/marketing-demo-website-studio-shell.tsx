"use client";

import { useMemo } from "react";
import { ExternalLink, Globe, Layers, Monitor, Sparkles } from "lucide-react";

import type { PublicSitePayload } from "@/lib/public-site-api";
import {
  getWebsiteCinemaDefaultSectionId,
  getWebsiteCinemaInspectorFields,
  getWebsiteSectionLabel,
  listWebsiteCinemaSections,
  normalizeWebsiteSectionType,
} from "@/lib/marketing/website-cinema-studio";
import { cn } from "@/lib/utils";

type MarketingDemoWebsiteStudioShellProps = {
  site: PublicSitePayload;
  siteHostname: string;
  children: React.ReactNode;
};

export function MarketingDemoWebsiteStudioShell({
  site,
  siteHostname,
  children,
}: MarketingDemoWebsiteStudioShellProps) {
  const sections = useMemo(() => listWebsiteCinemaSections(site), [site]);
  const selectedSectionId = getWebsiteCinemaDefaultSectionId(site);
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const inspectorFields = getWebsiteCinemaInspectorFields(
    selectedSection,
    site.upcomingActivities.length
  );

  const publishedLabel = site.publishedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(site.publishedAt)
      )
    : "Published";

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2 rounded-xl border border-border-warm bg-muted/20 p-2 sm:gap-2.5 sm:p-2.5"
      data-cinema-website-studio
    >
      <header className="shrink-0 space-y-1.5 rounded-lg border border-border-warm bg-card px-2.5 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Globe className="size-3.5 shrink-0 text-primary" aria-hidden />
            <p className="truncate text-xs font-semibold text-text-warm sm:text-sm">
              Website Studio
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            Published
          </span>
          <span className="truncate text-[10px] text-text-muted-warm sm:text-xs">
            {siteHostname}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-text-muted-warm sm:text-xs">
            {site.published.siteName} · last published {publishedLabel}
          </p>
          <div className="flex items-center gap-1" aria-hidden>
            <span className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-background px-2 py-1 text-[10px] font-medium text-text-warm">
              <Monitor className="size-3" />
              Preview
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
              <Sparkles className="size-3" />
              Publish
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(7.5rem,9rem)_minmax(0,1fr)_minmax(7.5rem,10rem)]">
        <aside
          className="hidden min-h-0 flex-col gap-1 overflow-hidden rounded-lg border border-border-warm bg-card p-1.5 lg:flex"
          aria-label="Page sections"
        >
          <p className="flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
            <Layers className="size-3" aria-hidden />
            Sections
          </p>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {sections.map((section) => {
              const isSelected = section.id === selectedSection?.id;
              return (
                <li key={section.id}>
                  <span
                    className={cn(
                      "block w-full rounded-md px-2 py-1 text-left text-[10px] leading-snug",
                      isSelected
                        ? "bg-primary/10 font-medium text-text-warm ring-1 ring-primary/25"
                        : "text-text-muted-warm"
                    )}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    {getWebsiteSectionLabel(section.type)}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="relative min-h-0 overflow-hidden rounded-lg border border-border-warm bg-paper shadow-inner">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-border-warm/60 bg-background/90 px-2 py-1 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-text-muted-warm">
              Live site canvas
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-text-muted-warm">
              <ExternalLink className="size-3" aria-hidden />
              Public preview
            </span>
          </div>
          <div className="h-full min-h-0 overflow-hidden pt-7">{children}</div>
        </div>

        <aside
          className="hidden min-h-0 flex-col gap-1 overflow-hidden rounded-lg border border-border-warm bg-card p-1.5 lg:flex"
          aria-label="Selected section settings"
        >
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
            Section
          </p>
          <p className="px-1 text-[11px] font-medium text-text-warm">
            {selectedSection
              ? getWebsiteSectionLabel(selectedSection.type)
              : "Section"}
          </p>
          <dl className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1">
            {inspectorFields.map((field) => (
              <div key={field.label} className="space-y-0.5">
                <dt className="text-[10px] font-medium text-text-muted-warm">
                  {field.label}
                </dt>
                <dd className="rounded-md border border-border-warm bg-background px-2 py-1 text-[10px] leading-snug text-text-warm">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
          {selectedSection &&
          normalizeWebsiteSectionType(selectedSection.type) ===
            "upcomingActivities" ? (
            <p className="px-1 text-[10px] leading-snug text-text-muted-warm">
              Activities you publish in Cohestra appear on the public site
              automatically.
            </p>
          ) : null}
        </aside>
      </div>

      <div
        className="flex gap-1 overflow-x-auto lg:hidden"
        aria-label="Page sections"
      >
        {sections.map((section) => {
          const isSelected = section.id === selectedSection?.id;
          return (
            <span
              key={section.id}
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium",
                isSelected
                  ? "border-primary/30 bg-primary/10 text-text-warm"
                  : "border-border-warm bg-card text-text-muted-warm"
              )}
              aria-current={isSelected ? "true" : undefined}
            >
              {getWebsiteSectionLabel(section.type)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
