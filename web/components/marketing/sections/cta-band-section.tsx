"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { marketingCtaClass } from "@/components/marketing/marketing-primitives";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { readPublicCta } from "@/lib/site-cta-utils";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";
import { cn } from "@/lib/utils";

function resolveCtaHref(target: string): string {
  if (target === "scroll-upcoming") {
    return "#upcoming-activities";
  }

  if (target.startsWith("activity:")) {
    const slug = target.slice("activity:".length).trim();
    return slug ? `/register/${slug}` : "/";
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }

  if (target.startsWith("/")) {
    return target;
  }

  return "/";
}

export function CtaBandPublicSection({ section }: { section: SiteSection }) {
  const headline = typeof section.props.headline === "string" ? section.props.headline : "";
  const description =
    typeof section.props.description === "string" ? section.props.description : "";
  const variant = readSectionVariant(section.props);
  const primaryCta = readPublicCta(section.props, "primaryCta");

  if (!headline && !description && !primaryCta) {
    return null;
  }

  const href = primaryCta ? resolveCtaHref(primaryCta.target) : null;
  const isExternal = href?.startsWith("http") ?? false;
  const isAccent = variant === "accent";

  return (
    <MarketingReveal
      as="section"
      className={cn(
        "marketing-scroll-rise relative mt-20 scroll-mt-28 overflow-hidden rounded-[1.75rem] border px-6 py-12 text-center sm:mt-24 sm:px-10 sm:py-14",
        isAccent
          ? "border-primary/25 bg-gradient-to-br from-primary/12 via-primary/6 to-accent/8"
          : "border-border-warm/60 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-md"
      )}
    >
      <div
        aria-hidden
        className="motion-safe:animate-marketing-gradient-drift pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-3xl space-y-4">
        {headline ? (
          <h2 className="text-marketing-section text-balance text-text-warm">{headline}</h2>
        ) : null}
        {description ? (
          <p className="text-marketing-lead mx-auto max-w-2xl text-text-muted-warm">
            {description}
          </p>
        ) : null}
        {primaryCta && href ? (
          <div className="mt-6 flex justify-center sm:mt-8">
            {isExternal ? (
              <a
                href={href}
                className={marketingCtaClass("default")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {primaryCta.label}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : primaryCta.target === "scroll-upcoming" ? (
              <a href={href} className={marketingCtaClass("default")}>
                {primaryCta.label}
              </a>
            ) : (
              <Link href={href} className={marketingCtaClass("default")}>
                {primaryCta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </MarketingReveal>
  );
}
