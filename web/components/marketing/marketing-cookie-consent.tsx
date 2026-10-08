"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CONSENT_ACCEPTED,
  CONSENT_ESSENTIAL,
  consentFromPreferences,
  readStoredMarketingConsent,
  shouldShowMarketingCookieBanner,
  writeStoredMarketingConsent,
} from "@/lib/marketing-cookie-consent";
import { cn } from "@/lib/utils";

function setBannerHeightVariable(px: number): void {
  document.documentElement.style.setProperty("--marketing-cookie-banner-height", `${px}px`);
}

export function MarketingCookieConsent() {
  const [visible, setVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [optionalAnalytics, setOptionalAnalytics] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const preferencesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      const stored = readStoredMarketingConsent();
      setVisible(shouldShowMarketingCookieBanner(stored, window.location.hash));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!visible) {
      setBannerHeightVariable(0);
      return;
    }
    const node = bannerRef.current;
    if (!node) {
      return;
    }
    const publish = () => setBannerHeightVariable(node.getBoundingClientRect().height);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      setBannerHeightVariable(0);
    };
  }, [visible]);

  function persist(value: typeof CONSENT_ACCEPTED | typeof CONSENT_ESSENTIAL) {
    writeStoredMarketingConsent(value);
    setPreferencesOpen(false);
    setVisible(false);
  }

  if (!visible) {
    return <div data-cookie-consent="hidden" hidden />;
  }

  return (
    <>
      <div
        ref={bannerRef}
        role="region"
        aria-label="Cookie consent"
        data-cookie-consent="visible"
        className="relative z-20 border-b border-line bg-paper px-5 py-3 sm:px-8 lg:px-10"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Cookies on this site</p>
            <p className="mt-1 max-w-3xl text-sm leading-snug text-text-muted">
              Essential cookies keep you signed in and remember this choice. Optional analytics are
              not currently used. See our{" "}
              <Link
                href="/privacy"
                className="font-medium text-lagoon underline-offset-2 hover:text-lagoon-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2"
              >
                Privacy policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <button
              type="button"
              className={cn(marketingAtelierButtonClass("lagoon", "sm"), "min-h-11 min-w-11 px-4")}
              onClick={() => persist(CONSENT_ACCEPTED)}
            >
              Accept
            </button>
            <button
              type="button"
              className={cn(marketingAtelierButtonClass("ghost", "sm"), "min-h-11 min-w-11 px-4")}
              onClick={() => persist(CONSENT_ESSENTIAL)}
            >
              Reject non-essential
            </button>
            <button
              ref={preferencesButtonRef}
              type="button"
              className={cn(marketingAtelierButtonClass("ghost", "sm"), "min-h-11 min-w-11 px-4")}
              onClick={() => {
                setOptionalAnalytics(false);
                setPreferencesOpen(true);
              }}
            >
              Preferences
            </button>
          </div>
        </div>
      </div>

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent
          finalFocus={preferencesButtonRef}
          className="w-[min(28rem,calc(100vw-1.5rem))] max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Essential cookies stay on. Optional analytics are off unless you turn them on. Cohestra
              does not currently run optional analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-text-warm">
              <input type="checkbox" checked disabled className="mt-1 size-4 shrink-0" />
              <span>
                <span className="font-medium">Essential cookies</span>
                <span className="mt-1 block text-text-muted-warm">
                  Required to keep you signed in and to remember this choice.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-text-warm">
              <input
                type="checkbox"
                checked={optionalAnalytics}
                onChange={(event) => setOptionalAnalytics(event.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                <span className="font-medium">Optional analytics</span>
                <span className="mt-1 block text-text-muted-warm">
                  Not currently used on this site. Leave off unless you want this choice on record.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="min-h-11 px-4" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              className="min-h-11 px-4"
              onClick={() => persist(consentFromPreferences(optionalAnalytics))}
            >
              Save choices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
