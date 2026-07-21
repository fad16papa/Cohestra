"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { TosCheckbox } from "@/components/legal/tos-checkbox";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal/legal-content";
import {
  fetchLegalComplianceVersions,
  submitSignupLegalGate,
  type LegalComplianceVersions,
} from "@/lib/legal/legal-api";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";

export function SignupPageContent() {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const [versions, setVersions] = useState<LegalComplianceVersions | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchLegalComplianceVersions()
      .then(setVersions)
      .catch(() => {
        setVersions({
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          termsPath: "/terms",
          privacyPath: "/privacy",
        });
      });
  }, []);

  async function handleContinue() {
    if (!accepted || !versions) {
      setError("Accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    const result = await submitSignupLegalGate({
      acceptTermsAndPrivacy: true,
      termsVersion: versions.termsVersion,
      privacyVersion: versions.privacyVersion,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setInfo(
      "Legal acceptance validated. Workspace creation and email verification ship in the next release."
    );
  }

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto max-w-xl flex-1 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">Start free</p>
          <h1 className="text-marketing-section mt-4 text-ink">Open your atelier</h1>
          <p className="text-marketing-lead mt-4 text-stone">
            Basic is free forever — no card required. Accept our legal terms to continue; workspace
            creation completes in the next step.
          </p>
        </MarketingReveal>

        <MarketingReveal delayMs={180} className="mt-10 space-y-6 rounded-[16px] border border-line bg-paper-warm p-6">
          <TosCheckbox checked={accepted} onCheckedChange={setAccepted} disabled={submitting} />

          {versions ? (
            <p className="text-xs text-stone">
              Current versions: Terms {versions.termsVersion} · Privacy {versions.privacyVersion}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {info ? (
            <p role="status" className="text-sm text-ink">
              {info}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!accepted || submitting || !versions}
              onClick={() => void handleContinue()}
              className={marketingAtelierButtonClass("lagoon")}
            >
              {submitting ? "Checking…" : "Continue"}
            </button>
            <Link href="/pricing" className={marketingAtelierButtonClass("ghost")}>
              View pricing
            </Link>
          </div>
        </MarketingReveal>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
