"use client";

import { MarketingStatTile } from "@/components/marketing/marketing-primitives";
import { previewLayoutClass, useSitePreviewLayout } from "@/lib/site-preview-layout";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";

import { SectionShell } from "./section-shell";

export function StatsPublicSection({ section }: { section: SiteSection }) {
  const previewMode = useSitePreviewLayout();
  const variant = readSectionVariant(section.props);
  const items = (Array.isArray(section.props.items) ? section.props.items : []).filter(
    (item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const value =
        typeof (item as Record<string, unknown>).value === "string"
          ? String((item as Record<string, unknown>).value).trim()
          : "";
      return Boolean(value);
    }
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionShell variant={variant}>
      <div
        className={previewLayoutClass(previewMode, {
          full: "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
          phone: "grid grid-cols-2 gap-3",
          desktop: "grid grid-cols-4 gap-4",
        })}
      >
        {items.map((item, index) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const record = item as Record<string, unknown>;
          const value = typeof record.value === "string" ? record.value : "";
          const label = typeof record.label === "string" ? record.label : "";

          return (
            <MarketingStatTile
              key={`stat-${index}`}
              value={value}
              label={label || undefined}
            />
          );
        })}
      </div>
    </SectionShell>
  );
}
