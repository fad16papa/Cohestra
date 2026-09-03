"use client";

import { Component, type ReactNode, useEffect, useState } from "react";

import { MarketingDemoProvider } from "@/components/marketing/marketing-demo-provider";
import { MarketingProductCarouselLegacy } from "@/components/marketing/marketing-product-carousel.legacy";
import { MarketingProductCinema } from "@/components/marketing/marketing-product-cinema";

class CinemaErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Marketing apex `#crm` section only — not tenant admin.
 * Desktop lg+ + motion-safe → chapter cinema; otherwise legacy click-tabs carousel.
 */
export function MarketingProductCarousel() {
  const [mode, setMode] = useState<"pending" | "cinema" | "legacy">("pending");
  const [chapterIndex, setChapterIndex] = useState(0);
  const [hashEpoch, setHashEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      const useCinema = desktopQuery.matches && !motionQuery.matches;
      setMode(useCinema ? "cinema" : "legacy");
    };

    sync();
    desktopQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      desktopQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#crm") {
        setChapterIndex(0);
        setHashEpoch((value) => value + 1);
      }
    };
    window.addEventListener("hashchange", onHash);

    // Same-hash Clients nav: capture clicks on header/footer links to /#crm
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href="/#crm"], a[href="#crm"]');
      if (!anchor) {
        return;
      }
      setChapterIndex(0);
      setHashEpoch((value) => value + 1);
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // Preserve chapter id across cinema ↔ legacy remounts (scoped to #crm).
  useEffect(() => {
    if (mode === "pending") {
      return;
    }
    const selected = document.querySelector(
      "#crm [role='tab'][aria-selected='true']"
    ) as HTMLElement | null;
    const id = selected?.id?.replace(/^(product-cinema-tab-|product-carousel-tab-)/, "");
    if (!id) {
      return;
    }
    const order = ["clients", "outreach", "dashboard", "campaigns", "reports", "website"];
    const idx = order.indexOf(id);
    if (idx >= 0) {
      setChapterIndex(idx);
    }
  }, [mode]);

  const legacy = (
    <MarketingProductCarouselLegacy
      key={`legacy-${hashEpoch}-${chapterIndex}`}
      initialIndex={chapterIndex}
    />
  );

  if (mode === "pending" || mode === "legacy") {
    return <MarketingDemoProvider>{legacy}</MarketingDemoProvider>;
  }

  return (
    <MarketingDemoProvider>
      <CinemaErrorBoundary fallback={legacy}>
        <MarketingProductCinema
          key={`cinema-${hashEpoch}`}
          initialIndex={chapterIndex}
        />
      </CinemaErrorBoundary>
    </MarketingDemoProvider>
  );
}
