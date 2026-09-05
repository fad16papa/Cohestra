"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  CINEMA_SECTION_LEAD,
  CINEMA_SECTION_THESIS,
  PRODUCT_SLIDES,
} from "@/lib/marketing/product-slides";
import { cn } from "@/lib/utils";

function CarouselIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line bg-paper text-ink transition-[transform,colors,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-ink/25 hover:bg-paper-warm hover:shadow-[0_10px_24px_rgba(7,13,18,0.06)]"
    >
      {children}
    </button>
  );
}

/** Frozen click-tabs carousel — mobile, reduced-motion, and cinema rollback. Marketing landing only. */
export function MarketingProductCarouselLegacy({
  sectionId = "crm",
  initialIndex = 0,
}: {
  sectionId?: string;
  initialIndex?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), PRODUCT_SLIDES.length - 1)
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const slide = PRODUCT_SLIDES[activeIndex]!;

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

  function goTo(index: number) {
    setActiveIndex((index + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length);
  }

  function goNext() {
    goTo(activeIndex + 1);
  }

  function goPrevious() {
    goTo(activeIndex - 1);
  }

  return (
    <section id={sectionId} className="scroll-mt-24 border-t border-line bg-paper-warm">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-marketing-section text-balance text-ink">{CINEMA_SECTION_THESIS}</h2>
          <p className="text-marketing-lead mt-4 text-stone-cinema">{CINEMA_SECTION_LEAD}</p>
        </div>

        <div className="-mx-5 mt-10 overflow-x-auto px-5 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
          <div
            role="tablist"
            aria-label="Club house tour"
            className="flex w-max min-w-full flex-nowrap justify-start gap-2 sm:w-auto sm:flex-wrap sm:justify-center"
          >
            {PRODUCT_SLIDES.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`product-carousel-tab-${item.id}`}
                  aria-selected={isActive}
                  aria-controls="product-carousel-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => goTo(index)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                      event.preventDefault();
                      const delta = event.key === "ArrowRight" ? 1 : -1;
                      const next =
                        (index + delta + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length;
                      goTo(next);
                      queueMicrotask(() => {
                        document
                          .getElementById(`product-carousel-tab-${PRODUCT_SLIDES[next]!.id}`)
                          ?.focus();
                      });
                    }
                    if (event.key === "Home") {
                      event.preventDefault();
                      goTo(0);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      goTo(PRODUCT_SLIDES.length - 1);
                    }
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,colors,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm motion-reduce:hover:translate-y-0",
                    isActive
                      ? "border-ink bg-ink text-paper shadow-[0_8px_20px_rgba(7,13,18,0.12)]"
                      : "border-line-strong bg-paper text-stone-cinema hover:-translate-y-0.5 hover:border-ink/25 hover:text-ink hover:shadow-[0_10px_24px_rgba(7,13,18,0.06)]"
                  )}
                >
                  {item.navLabel}
                </button>
              );
            })}
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {slide.navLabel}. {slide.job}.
        </p>

        <div
          role="tabpanel"
          id="product-carousel-panel"
          aria-labelledby={`product-carousel-tab-${slide.id}`}
          className="mt-6 flex flex-col gap-3"
        >
          <div
            key={`copy-${slide.id}`}
            className={cn(
              "border-b border-line/70 pb-3 text-left",
              !reducedMotion && "marketing-product-carousel-enter"
            )}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-cinema">
                {slide.feeling}
              </p>
              <h3 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,1.6vw,1.45rem)] font-medium leading-tight text-ink">
                {slide.feelingLine}
              </h3>
              <p className="max-w-3xl text-sm leading-snug text-stone-cinema">{slide.scene}</p>
            </div>
            <ul className="sr-only">
              {slide.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          </div>

          <div
            key={`visual-${slide.id}`}
            className={cn(
              "min-h-[420px] min-w-0 overflow-hidden rounded-md border border-line bg-paper sm:min-h-[480px] lg:min-h-[560px]",
              !reducedMotion && "marketing-product-carousel-enter"
            )}
            aria-hidden
            inert
          >
            {slide.visual}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div className="flex items-center gap-1.5">
            {PRODUCT_SLIDES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to ${item.navLabel}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
                className={cn(
                  "inline-flex min-h-6 min-w-6 items-center justify-center rounded-full",
                  index === activeIndex ? "" : "hover:opacity-80"
                )}
              >
                <span
                  className={cn(
                    "rounded-full transition-all",
                    index === activeIndex
                      ? "h-1.5 w-6 bg-lagoon"
                      : "size-1.5 bg-stone-cinema"
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <CarouselIconButton label="Previous product surface" onClick={goPrevious}>
              <ChevronLeft className="size-4" aria-hidden />
            </CarouselIconButton>
            <CarouselIconButton label="Next product surface" onClick={goNext}>
              <ChevronRight className="size-4" aria-hidden />
            </CarouselIconButton>
          </div>
        </div>
      </div>
    </section>
  );
}
