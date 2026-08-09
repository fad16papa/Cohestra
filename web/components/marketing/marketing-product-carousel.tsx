"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { MarketingCrmShowcase } from "@/components/marketing/marketing-crm-showcase";
import {
  CampaignsShowcaseMock,
  DashboardShowcaseMock,
  ReportsShowcaseMock,
} from "@/components/marketing/marketing-product-showcase-mocks";
import { cn } from "@/lib/utils";

type ProductSlideId = "clients" | "dashboard" | "campaigns" | "reports";

type ProductSlide = {
  id: ProductSlideId;
  navLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  points: readonly string[];
  visual: ReactNode;
};

const PRODUCT_SLIDES: ProductSlide[] = [
  {
    id: "clients",
    navLabel: "Clients",
    eyebrow: "Client CRM",
    title: "A client list your team actually uses",
    lead: "Every registration builds one profile. Search the list, open a client, see their history, and message them without leaving Cohestra.",
    points: [
      "Search and filter by status, nationality, or recent signup",
      "Lead status badges so the team knows who still needs a reply",
      "Full profile with contact details, registration history, and timeline",
      "WhatsApp and Viber open from the profile with messages saved automatically",
    ],
    visual: <MarketingCrmShowcase compact />,
  },
  {
    id: "dashboard",
    navLabel: "Dashboard",
    eyebrow: "Operations dashboard",
    title: "See what needs attention before your next session",
    lead: "Follow-up coverage, weekly registrations, and active activities in one calm view — no spreadsheet refresh required.",
    points: [
      "Follow-up queue shows who still needs a message",
      "Registration counts compared to last week",
      "Jump to clients, activities, or reports in one click",
      "Updates as your team works through the list",
    ],
    visual: <DashboardShowcaseMock />,
  },
  {
    id: "campaigns",
    navLabel: "Campaigns",
    eyebrow: "Email campaigns",
    title: "Reach your community with segmented email",
    lead: "Compose once, segment by activity or lead status, and track delivery without exporting to a separate email tool.",
    points: [
      "Segment recipients from your client list",
      "Preview on desktop and mobile before you send",
      "Delivery and failure counts on every campaign",
      "Campaign history saved on client profiles",
    ],
    visual: <CampaignsShowcaseMock />,
  },
  {
    id: "reports",
    navLabel: "Reports",
    eyebrow: "Reports and exports",
    title: "Filter performance and export when you need a spreadsheet",
    lead: "Weekly and monthly views with conjunctive filters — then export CSV for board meetings or sponsor updates.",
    points: [
      "Filter by date range, activity, community, or lead status",
      "Registration counts and unique client totals",
      "Export CSV on Basic; deeper filters on Core and Pro",
      "Saved views for recurring check-ins",
    ],
    visual: <ReportsShowcaseMock />,
  },
];

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
      className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line bg-paper text-ink transition-colors hover:border-ink/25 hover:bg-paper-warm"
    >
      {children}
    </button>
  );
}

export function MarketingProductCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
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
    <section id="crm" className="scroll-mt-24 border-t border-line bg-paper-warm">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-section text-gold">Inside the workspace</p>
          <h2 className="text-marketing-section mt-4 text-balance text-ink">
            One product for clients, dashboard, campaigns, and reports
          </h2>
          <p className="text-marketing-lead mt-4 text-stone">
            Browse each surface at full size — the same views your team uses every week.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Product surfaces"
          className="mt-10 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                aria-controls={`product-carousel-panel-${item.id}`}
                onClick={() => goTo(index)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-paper text-stone hover:border-ink/25 hover:text-ink"
                )}
              >
                {item.navLabel}
              </button>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing {slide.navLabel}: {slide.title}
        </p>

        <div
          role="tabpanel"
          id={`product-carousel-panel-${slide.id}`}
          aria-labelledby={`product-carousel-tab-${slide.id}`}
          className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,2.8fr)_minmax(0,3.2fr)] lg:gap-12"
        >
          <div
            key={`copy-${slide.id}`}
            className={cn(
              "text-center lg:text-left",
              !reducedMotion && "marketing-product-carousel-enter"
            )}
          >
            <p className="text-section text-gold">{slide.eyebrow}</p>
            <h3 className="text-marketing-section mx-auto mt-4 max-w-[18ch] text-balance text-ink lg:mx-0">
              {slide.title}
            </h3>
            <p className="text-marketing-lead mx-auto mt-4 max-w-xl text-stone lg:mx-0">
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
            key={`visual-${slide.id}`}
            className={cn(
              "min-h-[420px] min-w-0 sm:min-h-[460px] lg:min-h-[520px]",
              !reducedMotion && "marketing-product-carousel-enter"
            )}
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
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-6 bg-lagoon"
                    : "w-1.5 bg-line hover:bg-lagoon/40"
                )}
              />
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
