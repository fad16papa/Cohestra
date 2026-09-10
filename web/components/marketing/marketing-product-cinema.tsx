"use client";

import { useEffect, useState } from "react";

import { MarketingCinemaCaptionStrip } from "@/components/marketing/marketing-cinema-caption-strip";
import { MarketingCinemaReelStage } from "@/components/marketing/marketing-cinema-reel-stage";
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
    reel,
    activeIndex,
    activeId,
    liveAnnouncement,
    trackHeightVh,
    seekToIndex,
    resetToStart,
  } = useMarketingProductCinema(true, initialIndex);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusIndex, setFocusIndex] = useState(initialIndex);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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
        <div className="sticky top-24 z-20 flex h-[calc(100vh-6rem)] flex-col bg-paper-warm">
          <div className="mx-auto flex h-full w-full max-w-[96rem] min-h-0 flex-col px-2 sm:px-3 lg:px-4">
            <div
              role="tablist"
              aria-label="Club house tour"
              className="flex shrink-0 flex-wrap justify-center gap-2 border-b border-line/80 bg-paper-warm py-3"
            >
              {PRODUCT_SLIDES.map((item, index) => {
                const pillIndex =
                  reel.handoffProgress >= 0.5 && reel.currentIndex < reel.nextIndex
                    ? reel.nextIndex
                    : reel.currentIndex;
                const isSelected = index === pillIndex;
                const isFocused = index === focusIndex;
                const showProgress = isSelected && index === reel.currentIndex;
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
                      "relative shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm",
                      isSelected
                        ? "border-ink bg-ink text-paper shadow-[0_8px_20px_rgba(7,13,18,0.12)]"
                        : "border-line-strong bg-paper text-stone-cinema hover:border-ink/25 hover:text-ink"
                    )}
                  >
                    {item.navLabel}
                    {showProgress ? (
                      <span
                        className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-gold-cinema/70"
                        style={{
                          transform: `scaleX(${Math.max(reel.roomProgress, 0.04)})`,
                          opacity: reducedMotion ? 0.85 : 1,
                        }}
                        aria-hidden
                      />
                    ) : null}
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
              aria-labelledby={`product-cinema-tab-${
                reel.handoffProgress >= 0.5 && reel.currentIndex < reel.nextIndex
                  ? PRODUCT_SLIDES[reel.nextIndex]!.id
                  : activeId
              }`}
              className="flex min-h-0 flex-1 flex-col overflow-hidden py-2 lg:py-3"
            >
              <MarketingCinemaCaptionStrip reel={reel} reducedMotion={reducedMotion} />

              <div
                className="marketing-cinema-visual mt-2 flex min-h-0 min-w-0 flex-1 flex-col pointer-events-none"
                aria-hidden
                inert
              >
                <MarketingCinemaReelStage reel={reel} reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
