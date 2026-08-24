"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import { getPublicApiBaseUrl } from "@/lib/api";
import { isPaddleTransactionId } from "@/lib/billing/paddle-return";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function PaddleReturnContent() {
  const searchParams = useSearchParams();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const transactionId =
    searchParams.get("_ptxn") ?? searchParams.get("transactionId") ?? "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPaddleTransactionId(transactionId)) {
      setError("This checkout return link is missing a valid payment reference.");
      return;
    }

    let cancelled = false;

    async function redirectToWorkspace() {
      try {
        const response = await fetch(
          `${getPublicApiBaseUrl()}/api/v1/system/paddle/checkout-return?transactionId=${encodeURIComponent(transactionId)}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        if (!response.ok) {
          throw new Error("not-found");
        }

        const raw = (await response.json()) as {
          redirectUrl?: string;
          RedirectUrl?: string;
        };
        const redirectUrl = raw.redirectUrl ?? raw.RedirectUrl;
        if (!redirectUrl || !isHttpUrl(redirectUrl)) {
          throw new Error("invalid-url");
        }

        if (!cancelled) {
          window.location.replace(redirectUrl);
        }
      } catch {
        if (!cancelled) {
          setError(
            "We couldn't match this checkout to a workspace. Open your workspace dashboard and refresh billing."
          );
        }
      }
    }

    void redirectToWorkspace();

    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  return (
    <>
      <div ref={anchorRef} className="sr-only" />
      <MarketingShell scrolled={scrolled}>
        <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
          <h1 className="font-display text-3xl text-ink">
            {error ? "Couldn't return to your workspace" : "Returning to your workspace"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {error
              ?? "Checkout finished. Taking you back to your Cohestra dashboard…"}
          </p>
          {error ? (
            <Link href="/login" className={`${marketingAtelierButtonClass("lagoon")} mt-8 w-fit`}>
              Go to login
            </Link>
          ) : null}
        </main>
        <MarketingFooter />
      </MarketingShell>
    </>
  );
}

export function PaddleReturnPageContent() {
  return (
    <Suspense
      fallback={
        <MarketingShell>
          <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
            <h1 className="font-display text-3xl text-ink">Returning to your workspace</h1>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Checkout finished. Taking you back to your Cohestra dashboard…
            </p>
          </main>
          <MarketingFooter />
        </MarketingShell>
      }
    >
      <PaddleReturnContent />
    </Suspense>
  );
}
