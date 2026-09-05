"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cohestra-marketing-cookie-consent";

export function MarketingCookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      // Hide over Live Proof Cinema — Cohestra cookies must not cover Harbourline.
      if (window.location.hash === "#crm") {
        setVisible(false);
        return;
      }
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        setVisible(!stored);
      } catch {
        setVisible(true);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-[16px] border border-line bg-paper/95 p-5 shadow-[0_24px_60px_rgba(7,13,18,0.16)] backdrop-blur-md",
        "sm:inset-x-auto sm:right-6 sm:bottom-6"
      )}
    >
      <p className="text-sm font-semibold text-ink">Cookies on this site</p>
      <p className="mt-2 text-sm leading-relaxed text-stone">
        We use essential cookies to keep you signed in and optional analytics to improve Cohestra.
        See our{" "}
        <Link href="/privacy" className="font-medium text-lagoon hover:text-lagoon-deep">
          Privacy policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(marketingAtelierButtonClass("lagoon", "sm"), "px-4")}
          onClick={accept}
        >
          Accept
        </button>
        <Link
          href="/privacy"
          className={cn(marketingAtelierButtonClass("ghost", "sm"), "px-4")}
          onClick={accept}
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}
