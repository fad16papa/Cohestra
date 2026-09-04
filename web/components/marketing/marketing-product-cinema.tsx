"use client";

import { useEffect, useState } from "react";

import { useMarketingProductCinema } from "@/components/marketing/use-marketing-product-cinema";
import {
  CINEMA_SECTION_LEAD,
  CINEMA_SECTION_THESIS,
  PRODUCT_SLIDES,
} from "@/lib/marketing/product-slides";
import { cn } from "@/lib/utils";

function focusTab(id: string) {
  document.getElementById(`product-cinema-tab-${id}`)?.focus({ preventScroll: true });
}

/** Desktop lg+ Live Proof Cinema — marketing apex `#crm` only. */
export function MarketingProductCinema({ initialIndex = 0 }: { initialIndex?: number }) {
  const {
    trackRef,
    activeIndex,
    activeId,
    liveAnnouncement,
    climaxArmed,
    trackHeightVh,
    seekToIndex,
    resetToStart,
  } = useMarketingProductCinema(true, initialIndex);

  const [playClimax, setPlayClimax] = useState(false);
  const [focusIndex, setFocusIndex] = useState(initialIndex);
  const slide = PRODUCT_SLIDES[activeIndex]!;

  useEffect(() => {
    if (!climaxArmed) {
      setPlayClimax(false);
      return;
    }
    setPlayClimax(false);
    const arm = window.requestAnimationFrame(() => setPlayClimax(true));
    const timer = window.setTimeout(() => setPlayClimax(false), 520);
    return () => {
      window.cancelAnimationFrame(arm);
      window.clearTimeout(timer);
    };
  }, [climaxArmed]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#crm") {
        resetToStart();
        setFocusIndex(0);
        queueMicrotask(() => focusTab(PRODUCT_SLIDES[0]!.id));
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [resetToStart]);

  return (
    <section id="crm" className="scroll-mt-24 border-t border-line bg-paper-warm">
      <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 lg:px-10 lg:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-marketing-section text-balance text-ink">{CINEMA_SECTION_THESIS}</h2>
          <p className="text-marketing-lead mt-4 text-stone-cinema">{CINEMA_SECTION_LEAD}</p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative mt-8"
        style={{ height: `${trackHeightVh}vh` }}
      >
        {/* Full remaining viewport under sticky marketing header */}
        <div className="sticky top-24 z-20 flex h-[calc(100vh-6rem)] flex-col bg-paper-warm">
          <div className="mx-auto flex h-full w-full max-w-[90rem] min-h-0 flex-col px-5 sm:px-8 lg:px-10">
            <div
              role="tablist"
              aria-label="Club house tour"
              className="flex shrink-0 flex-wrap justify-center gap-2 border-b border-line/80 bg-paper-warm py-3"
            >
              {PRODUCT_SLIDES.map((item, index) => {
                const isSelected = index === activeIndex;
                const isFocused = index === focusIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`product-cinema-tab-${item.id}`}
                    aria-selected={isSelected}
                    aria-controls="product-cinema-panel"
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => {
                      setFocusIndex(index);
                      seekToIndex(index);
                    }}
                    onFocus={() => setFocusIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                        event.preventDefault();
                        const delta = event.key === "ArrowRight" ? 1 : -1;
                        const next =
                          (index + delta + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length;
                        setFocusIndex(next);
                        focusTab(PRODUCT_SLIDES[next]!.id);
                        seekToIndex(next);
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        setFocusIndex(0);
                        focusTab(PRODUCT_SLIDES[0]!.id);
                        seekToIndex(0);
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        const last = PRODUCT_SLIDES.length - 1;
                        setFocusIndex(last);
                        focusTab(PRODUCT_SLIDES[last]!.id);
                        seekToIndex(last);
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        seekToIndex(index);
                      }
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm",
                      isSelected
                        ? "border-ink bg-ink text-paper shadow-[0_8px_20px_rgba(7,13,18,0.12)]"
                        : "border-line-strong bg-paper text-stone-cinema hover:border-ink/25 hover:text-ink"
                    )}
                  >
                    {item.navLabel}
                  </button>
                );
              })}
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {liveAnnouncement}
            </p>

            <div
              role="tabpanel"
              id="product-cinema-panel"
              aria-labelledby={`product-cinema-tab-${activeId}`}
              className="flex min-h-0 flex-1 flex-col overflow-hidden py-2 lg:py-3"
            >
              {/* Caption strip only — product/world must dominate (~85–90%) */}
              <div
                key={`copy-${activeId}`}
                className="marketing-product-carousel-enter shrink-0 border-b border-line/70 pb-2.5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-cinema">
                    {slide.feeling}
                  </p>
                  <h3 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,1.6vw,1.45rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
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

              {/* Product stage — fills remaining height */}
              <div
                className={cn(
                  "marketing-cinema-visual mt-2 flex min-h-0 min-w-0 flex-1 flex-col pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  playClimax && "marketing-cinema-climax"
                )}
                aria-hidden
                inert
              >
                <div
                  key={`visual-${activeId}`}
                  className="marketing-product-carousel-enter flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-paper shadow-[0_12px_32px_rgba(7,13,18,0.06)] [&>div]:flex [&>div]:h-full [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
                >
                  {slide.visual}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
