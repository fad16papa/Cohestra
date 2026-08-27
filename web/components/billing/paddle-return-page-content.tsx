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
import { openPaddleCheckoutOverlay } from "@/lib/billing/paddle-checkout";
import {
  isPaddleTransactionId,
  isPaidPaddlePlanName,
  shouldOpenPaddleCheckoutOnReturn,
} from "@/lib/billing/paddle-return";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type CheckoutReturnPayload = {
  redirectUrl: string;
  plan?: string;
  clientToken?: string;
  openCheckout: boolean;
};

async function loadCheckoutReturn(
  transactionId: string,
  signal?: AbortSignal
): Promise<CheckoutReturnPayload> {
  const response = await fetch(
    `/api/v1/system/paddle/checkout-return?transactionId=${encodeURIComponent(transactionId)}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(20_000),
    }
  );
  if (!response.ok) {
    throw new Error("not-found");
  }

  const raw = (await response.json()) as {
    redirectUrl?: string;
    RedirectUrl?: string;
    plan?: string;
    Plan?: string;
    openCheckout?: boolean;
    OpenCheckout?: boolean;
    clientToken?: string;
    ClientToken?: string;
  };
  const redirectUrl = raw.redirectUrl ?? raw.RedirectUrl;
  if (!redirectUrl || !isHttpUrl(redirectUrl)) {
    throw new Error("invalid-url");
  }

  return {
    redirectUrl,
    plan: raw.plan ?? raw.Plan,
    clientToken: raw.clientToken ?? raw.ClientToken,
    openCheckout: Boolean(raw.openCheckout ?? raw.OpenCheckout),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForPaidRedirect(
  transactionId: string,
  fallbackUrl: string,
  isCancelled: () => boolean
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(400);
    if (isCancelled()) {
      return;
    }

    try {
      const result = await loadCheckoutReturn(transactionId);
      if (isCancelled()) {
        return;
      }

      if (isPaidPaddlePlanName(result.plan) || !result.openCheckout) {
        window.location.replace(result.redirectUrl);
        return;
      }
    } catch {
      // Paddle can lag behind checkout.completed; keep polling.
    }
  }

  if (!isCancelled()) {
    window.location.replace(fallbackUrl);
  }
}

function PaddleReturnContent() {
  const searchParams = useSearchParams();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const transactionId =
    searchParams.get("_ptxn") ?? searchParams.get("transactionId") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    if (!isPaddleTransactionId(transactionId)) {
      setError("This checkout return link is missing a valid payment reference.");
      return;
    }

    let cancelled = false;
    let checkoutCompleted = false;

    async function redirectToWorkspace() {
      try {
        const result = await loadCheckoutReturn(transactionId);
        if (cancelled) {
          return;
        }

        if (
          shouldOpenPaddleCheckoutOnReturn({
            openCheckout: result.openCheckout,
            clientToken: result.clientToken,
            plan: result.plan,
          })
        ) {
          setCollecting(true);
          try {
            await openPaddleCheckoutOverlay({
              clientToken: result.clientToken!,
              transactionId,
              onCompleted: () => {
                checkoutCompleted = true;
                void waitForPaidRedirect(
                  transactionId,
                  result.redirectUrl,
                  () => cancelled
                );
              },
              onClosed: () => {
                if (!checkoutCompleted && !cancelled) {
                  window.location.replace(result.redirectUrl);
                }
              },
            });
          } catch {
            if (!cancelled) {
              window.location.replace(result.redirectUrl);
            }
          }
          return;
        }

        window.location.replace(result.redirectUrl);
      } catch {
        if (!cancelled) {
          setCollecting(false);
          setError(
            `We couldn't match this checkout to a workspace. Open http://YOUR-SLUG.localhost:8088/dashboard?billing=success&session_id=${transactionId} or use Settings → Billing → Refresh billing status.`
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
            {error
              ? "Couldn't return to your workspace"
              : collecting
                ? "Complete your checkout"
                : "Returning to your workspace"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {error
              ?? (collecting
                ? "Enter your card in the Paddle window. Sandbox card 4242 4242 4242 4242 · any future expiry · any CVC. You will not be charged during the trial."
                : "Taking you back to your Cohestra workspace…")}
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
              Taking you back to your Cohestra workspace…
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
