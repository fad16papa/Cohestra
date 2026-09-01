"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { useMarketingProductCinema } from "@/components/marketing/use-marketing-product-cinema";
import { PRODUCT_SLIDES } from "@/lib/marketing/product-slides";
import { cn } from "@/lib/utils";

function focusTab(id: string) {
  document.getElementById(`product-cinema-tab-${id}`)?.focus({ preventScroll: true });
}

/** Desktop lg+ chapter cinema — marketing apex `#crm` only. */
export function MarketingProductCinema({ initialIndex = 0 }: { initialIndex?: number }) {
  const {
    trackRef,
    activeIndex,
    activeId,
    liveAnnouncement,
    climaxArmed,
    trackHeightVh,
    seekToIndex,
    resetToClients,
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
        resetToClients();
        setFocusIndex(0);
        queueMicrotask(() => focusTab(PRODUCT_SLIDES[0]!.id));
      }
    };
    // Only on real hash changes — not every cinema mount (preserves remount chapter).
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [resetToClients]);

  return (
    <section id="crm" className="scroll-mt-24 border-t border-line bg-paper-warm">
      <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 lg:px-10 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-section text-gold-cinema">Inside the workspace</p>
          <h2 className="text-marketing-section mt-4 text-balance text-ink">
            One product, one platform, covers all your need
          </h2>
          <p className="text-marketing-lead mt-4 text-stone-cinema">
            Browse each surface at full size — the same views your team uses every week.
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative mt-10"
        style={{ height: `${trackHeightVh}vh` }}
      >
        <div className="sticky top-24 z-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden bg-paper-warm pb-10">
          <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-5 sm:px-8 lg:px-10">
            <div
              role="tablist"
              aria-label="Product surfaces"
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
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        setFocusIndex(0);
                        focusTab(PRODUCT_SLIDES[0]!.id);
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        const last = PRODUCT_SLIDES.length - 1;
                        setFocusIndex(last);
                        focusTab(PRODUCT_SLIDES[last]!.id);
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        seekToIndex(index);
                      }
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm",
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
              className="mt-6 grid min-h-0 flex-1 items-center gap-8 overflow-hidden lg:grid-cols-[minmax(0,2.8fr)_minmax(0,3.2fr)] lg:gap-12"
            >
              <div
                key={`copy-${activeId}`}
                className="marketing-product-carousel-enter min-h-0 overflow-y-auto text-left"
              >
                <p className="text-section text-gold-cinema">{slide.eyebrow}</p>
                <h3 className="text-marketing-section mt-4 max-w-[18ch] text-balance text-ink">
                  {slide.title}
                </h3>
                <p className="text-marketing-lead mt-4 max-w-xl text-stone-cinema">
                  {slide.lead}
                </p>
                <ul className="mt-8 space-y-3 text-left text-[0.95rem]">
                  {slide.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-ink/85">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lagoon/12 text-lagoon">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={cn(
                  "min-h-0 min-w-0 overflow-hidden pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  playClimax && "marketing-cinema-climax"
                )}
                aria-hidden
                inert
              >
                <div key={`visual-${activeId}`} className="marketing-product-carousel-enter">
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
