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
  const chapterNumber = String(activeIndex + 1).padStart(2, "0");

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
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [resetToClients]);

  return (
    <section id="crm" className="scroll-mt-24 border-t border-line bg-paper-warm">
      <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 lg:px-10 lg:pt-16">
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
        className="relative mt-8"
        style={{ height: `${trackHeightVh}vh` }}
      >
        {/* Full remaining viewport under sticky marketing header */}
        <div className="sticky top-24 z-20 flex h-[calc(100vh-6rem)] flex-col bg-paper-warm">
          <div className="mx-auto flex h-full w-full max-w-[90rem] min-h-0 flex-col px-5 sm:px-8 lg:px-10">
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
              className="grid min-h-0 flex-1 items-stretch gap-6 overflow-hidden py-3 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.7fr)] lg:gap-8 lg:py-4 xl:gap-10"
            >
              {/* Copy — fills height; each capability gets clear visual weight */}
              <div
                key={`copy-${activeId}`}
                className="marketing-product-carousel-enter flex h-full min-h-0 flex-col overflow-y-auto pr-1 text-left"
              >
                <div className="shrink-0">
                  <div className="flex items-baseline gap-3">
                    <span
                      aria-hidden
                      className="font-[family-name:var(--font-fraunces)] text-4xl font-medium tracking-[-0.03em] text-ink/14 sm:text-5xl"
                    >
                      {chapterNumber}
                    </span>
                    <p className="text-section text-gold-cinema">{slide.eyebrow}</p>
                  </div>
                  <h3 className="mt-3 max-w-[24ch] text-balance font-[family-name:var(--font-fraunces)] text-[clamp(1.95rem,2.8vw,2.85rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                    {slide.title}
                  </h3>
                  <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-stone-cinema xl:text-[1.1rem]">
                    {slide.lead}
                  </p>
                </div>

                <ul className="mt-6 flex min-h-0 flex-1 flex-col justify-center gap-3 border-y border-line/70 py-5 xl:mt-7 xl:gap-3.5 xl:py-6">
                  {slide.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3.5 rounded-2xl bg-paper/70 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(7,13,18,0.04)] xl:px-4 xl:py-3.5"
                    >
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-lagoon/14 text-lagoon">
                        <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
                      </span>
                      <span className="text-[0.98rem] font-medium leading-snug text-ink xl:text-[1.02rem]">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-cinema/60">
                  Chapter {activeIndex + 1} of {PRODUCT_SLIDES.length}
                  <span className="mx-2 font-normal text-line" aria-hidden>
                    ·
                  </span>
                  <span className="font-medium tracking-[0.12em]">Scroll to continue</span>
                </p>
              </div>

              {/* Product stage — fills remaining height */}
              <div
                className={cn(
                  "marketing-cinema-visual flex h-full min-h-0 min-w-0 flex-col pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  playClimax && "marketing-cinema-climax"
                )}
                aria-hidden
                inert
              >
                <div
                  key={`visual-${activeId}`}
                  className="marketing-product-carousel-enter flex h-full min-h-0 flex-1 flex-col [&_.marketing-crm-showcase-frame]:h-full [&_.marketing-crm-showcase-surface]:h-full [&_.marketing-crm-showcase-surface]:min-h-0 [&>div]:flex [&>div]:h-full [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
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
