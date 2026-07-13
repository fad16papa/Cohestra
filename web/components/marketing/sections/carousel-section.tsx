"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  marketingCtaClass,
  marketingIconButtonClass,
  marketingSurfaceClass,
} from "@/components/marketing/marketing-primitives";
import { previewLayoutClass, useSitePreviewLayout } from "@/lib/site-preview-layout";
import { readPublicCta } from "@/lib/site-cta-utils";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { cn } from "@/lib/utils";

import { SectionShell, SectionTitle } from "./section-shell";

function resolveCtaHref(target: string): string {
  if (target === "scroll-upcoming") {
    return "#upcoming-activities";
  }

  if (target.startsWith("activity:")) {
    const slug = target.slice("activity:".length).trim();
    return slug ? `/register/${slug}` : "/";
  }

  if (target.startsWith("/")) {
    return target;
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }

  return "/";
}

function CarouselCta({ label, target }: { label: string; target: string }) {
  const href = resolveCtaHref(target);
  const isExternal = href.startsWith("http");
  const className = cn(marketingCtaClass("default"), "h-9 px-5 text-xs sm:h-10 sm:text-sm");

  if (isExternal) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {label}
        <ArrowRight className="size-4" aria-hidden />
      </a>
    );
  }

  if (target === "scroll-upcoming") {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export function CarouselPublicSection({ section }: { section: SiteSection }) {
  const previewMode = useSitePreviewLayout();
  const title = typeof section.props.title === "string" ? section.props.title : "";
  const autoplay = section.props.autoplay === true;
  const variant = readSectionVariant(section.props);
  const slides = useMemo(
    () =>
      (Array.isArray(section.props.slides) ? section.props.slides : []).filter((slide) => {
        if (typeof slide !== "object" || slide === null) {
          return false;
        }

        const record = slide as Record<string, unknown>;
        const imageAssetId =
          typeof record.imageAssetId === "string" ? record.imageAssetId.trim() : "";
        const headline = typeof record.headline === "string" ? record.headline.trim() : "";
        return Boolean(imageAssetId || headline);
      }),
    [section.props.slides]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!autoplay || reducedMotion || slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [autoplay, reducedMotion, slides.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const child = container.children[activeIndex] as HTMLElement | undefined;
    if (!child) {
      return;
    }

    container.scrollTo({
      left: child.offsetLeft,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeIndex, reducedMotion]);

  if (slides.length === 0) {
    return null;
  }

  const carouselLabel = title.trim() || "Featured carousel";
  const activeSlide = slides[activeIndex];
  const activeSlideRecord =
    typeof activeSlide === "object" && activeSlide !== null
      ? (activeSlide as Record<string, unknown>)
      : null;
  const activeSlideHeadline =
    typeof activeSlideRecord?.headline === "string"
      ? activeSlideRecord.headline.trim()
      : "";
  const slideAnnouncement = activeSlideHeadline
    ? `Slide ${activeIndex + 1} of ${slides.length}: ${activeSlideHeadline}`
    : `Slide ${activeIndex + 1} of ${slides.length}`;

  return (
    <SectionShell variant={variant}>
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {slideAnnouncement}
      </p>
      <div className="relative">
        <div
          ref={scrollRef}
          role="region"
          aria-label={carouselLabel}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => {
            if (typeof slide !== "object" || slide === null) {
              return null;
            }

            const record = slide as Record<string, unknown>;
            const imageAssetId =
              typeof record.imageAssetId === "string" ? record.imageAssetId.trim() : "";
            const imageUrl = imageAssetId
              ? resolveHeroImageUrl(`/api/v1/public/campaign-assets/${imageAssetId}`)
              : null;
            const headline =
              typeof record.headline === "string" ? record.headline.trim() : "";
            const description =
              typeof record.description === "string" ? record.description.trim() : "";
            const cta = readPublicCta(record, "cta");

            return (
              <article
                key={`slide-${index}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={cn(
                  marketingSurfaceClass(
                    "min-w-0 flex-1 snap-start overflow-hidden p-0 hover:translate-y-0"
                  ),
                  previewLayoutClass(previewMode, {
                    full: "min-w-[min(100%,20rem)] sm:min-w-[26rem]",
                    phone: "min-w-full",
                    desktop: "min-w-[26rem]",
                  }),
                  index === activeIndex && "ring-2 ring-primary/20"
                )}
              >
                {imageUrl ? (
                  <div className="relative aspect-[16/9] w-full bg-muted">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 26rem"
                      unoptimized={imageUrl.includes("/api/")}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                    />
                  </div>
                ) : null}
                <div className="space-y-3 p-5 sm:p-6">
                  {headline ? (
                    <h3 className="text-lg font-semibold tracking-tight text-text-warm">
                      {headline}
                    </h3>
                  ) : null}
                  {description ? (
                    <p className="text-sm leading-relaxed text-text-muted-warm">{description}</p>
                  ) : null}
                  {cta ? <CarouselCta label={cta.label} target={cta.target} /> : null}
                </div>
              </article>
            );
          })}
        </div>

        {slides.length > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === activeIndex
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-border-warm hover:bg-primary/40"
                  )}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={marketingIconButtonClass()}
                aria-label="Previous slide"
                onClick={() =>
                  setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
                }
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className={marketingIconButtonClass()}
                aria-label="Next slide"
                onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
