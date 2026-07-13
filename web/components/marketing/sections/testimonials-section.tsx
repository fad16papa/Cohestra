"use client";

import { MarketingQuoteCard } from "@/components/marketing/marketing-primitives";
import { previewLayoutClass, useSitePreviewLayout } from "@/lib/site-preview-layout";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

import { SectionShell, SectionTitle } from "./section-shell";

export function TestimonialsPublicSection({ section }: { section: SiteSection }) {
  const previewMode = useSitePreviewLayout();
  const title = typeof section.props.title === "string" ? section.props.title : "";
  const variant = readSectionVariant(section.props);
  const items = (Array.isArray(section.props.items) ? section.props.items : []).filter(
    (item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const quote =
        typeof (item as Record<string, unknown>).quote === "string"
          ? String((item as Record<string, unknown>).quote).trim()
          : "";
      return Boolean(quote);
    }
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionShell variant={variant}>
      {title ? <SectionTitle align="center">{title}</SectionTitle> : null}
      <div
        className={previewLayoutClass(previewMode, {
          full: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
          phone: "grid grid-cols-1 gap-3",
          desktop: "grid grid-cols-3 gap-4",
        })}
      >
        {items.map((item, index) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const record = item as Record<string, unknown>;
          const quote = typeof record.quote === "string" ? record.quote : "";
          const name = typeof record.name === "string" ? record.name : "";
          const role = typeof record.role === "string" ? record.role : "";
          const avatarAssetId =
            typeof record.avatarAssetId === "string" ? record.avatarAssetId.trim() : "";
          const avatarUrl = avatarAssetId
            ? resolveHeroImageUrl(`/api/v1/public/campaign-assets/${avatarAssetId}`)
            : null;

          return (
            <MarketingQuoteCard
              key={`testimonial-${index}`}
              quote={quote}
              name={name || undefined}
              role={role || undefined}
              avatarUrl={avatarUrl}
            />
          );
        })}
      </div>
    </SectionShell>
  );
}
