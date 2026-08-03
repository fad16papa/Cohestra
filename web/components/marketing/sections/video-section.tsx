"use client";

import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";
import { readVideoEmbedFromSectionProps } from "@/lib/site-video-embed";

import { SectionShell, SectionTitle } from "./section-shell";

type VideoPublicSectionProps = {
  section: SiteSection;
};

export function VideoPublicSection({ section }: VideoPublicSectionProps) {
  const variant = readSectionVariant(section.props);
  const embed = readVideoEmbedFromSectionProps(section.props as Record<string, unknown>);

  if (!embed) {
    return null;
  }

  const title = typeof section.props.title === "string" ? section.props.title.trim() : "";
  const description =
    typeof section.props.description === "string" ? section.props.description.trim() : "";
  const iframeTitle = title || "Community video";

  return (
    <SectionShell variant={variant}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {title ? <SectionTitle>{title}</SectionTitle> : null}
        {description ? (
          <p className="text-sm leading-relaxed text-text-muted-warm sm:text-base">{description}</p>
        ) : null}
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border-warm bg-muted/20 shadow-sm">
          <iframe
            src={embed.embedUrl}
            title={iframeTitle}
            loading="lazy"
            className="absolute inset-0 size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </SectionShell>
  );
}
