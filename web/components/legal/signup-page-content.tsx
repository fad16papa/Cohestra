"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RecaptchaCheckbox } from "@/components/legal/recaptcha-checkbox";
import { TosCheckbox } from "@/components/legal/tos-checkbox";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal/legal-content";
import {
  fetchLegalComplianceVersions,
  type LegalComplianceVersions,
} from "@/lib/legal/legal-api";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  checkSignupSlug,
  submitPublicSignup,
  type SlugAvailability,
} from "@/lib/signup/signup-api";

function slugifyOrgName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  const [versions, setVersions] = useState<LegalComplianceVersions | null>(null);
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugAvailability | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPaidPlanHint = plan === "core" || plan === "pro";

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

  useEffect(() => {
    if (!slugTouched && orgName.trim().length > 0) {
      setSlug(slugifyOrgName(orgName));
    }
  }, [orgName, slugTouched]);

  useEffect(() => {
    if (!slug.trim()) {
      setSlugStatus(null);
      return;
    }

    const handle = window.setTimeout(() => {
      setSlugChecking(true);
      void checkSignupSlug(slug)
        .then(setSlugStatus)
        .catch(() => setSlugStatus(null))
        .finally(() => setSlugChecking(false));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [slug]);

  const handleCaptchaChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const canSubmit = useMemo(
    () =>
      accepted
      && versions
      && orgName.trim().length > 0
      && slug.trim().length > 0
      && email.trim().length > 0
      && password.length >= 8
      && captchaToken
      && slugStatus?.available === true
      && !submitting,
    [
      accepted,
      versions,
      orgName,
      slug,
      email,
      password,
      captchaToken,
      slugStatus,
      submitting,
    ]
  );

  async function handleSubmit() {
    if (!versions || !captchaToken) {
      setError("Complete all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitPublicSignup({
      acceptTermsAndPrivacy: true,
      termsVersion: versions.termsVersion,
      privacyVersion: versions.privacyVersion,
      orgName: orgName.trim(),
      slug: slug.trim(),
      email: email.trim(),
      password,
      captchaToken,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(
        result.suggestions.length > 0
          ? `${result.message} Try: ${result.suggestions.join(", ")}`
          : result.message
      );
      return;
    }

    const params = new URLSearchParams({
      email: result.result.email,
      slug: result.result.tenantSlug,
    });
    router.push(`/signup/verify?${params.toString()}`);
  }

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto max-w-xl flex-1 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">Start free</p>
          <h1 className="text-marketing-section mt-4 text-ink">Open your atelier</h1>
          <p className="text-marketing-lead mt-4 text-stone">
            Basic is free forever — no card required. Verify your email before opening the dashboard.
          </p>
          {isPaidPlanHint ? (
            <p className="mt-3 text-sm text-stone">
              Paid trials ({plan}) checkout ships in the next release — this step creates your free Basic workspace first.
            </p>
          ) : null}
        </MarketingReveal>

        <MarketingReveal delayMs={180} className="mt-10 space-y-5 rounded-[16px] border border-line bg-paper-warm p-6">
          <div className="space-y-2">
            <label htmlFor="orgName" className="text-sm font-medium text-ink">
              Organization name
            </label>
            <input
              id="orgName"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
              autoComplete="organization"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium text-ink">
              Workspace slug
            </label>
            <input
              id="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
              autoComplete="off"
              disabled={submitting}
            />
            <p className="text-xs text-stone">
              Your workspace: <span className="font-medium">{slug || "your-org"}.cohestra.app</span>
            </p>
            {slugChecking ? <p className="text-xs text-stone">Checking availability…</p> : null}
            {slugStatus && !slugStatus.available ? (
              <p role="alert" className="text-xs text-destructive">
                {slugStatus.validationError}
                {slugStatus.suggestions.length > 0
                  ? ` Suggestions: ${slugStatus.suggestions.join(", ")}`
                  : ""}
              </p>
            ) : null}
            {slugStatus?.available ? (
              <p className="text-xs text-lagoon">Slug is available.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Admin email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
              autoComplete="new-password"
              disabled={submitting}
            />
            <p className="text-xs text-stone">At least 8 characters with upper, lower, and a number.</p>
          </div>

          <TosCheckbox checked={accepted} onCheckedChange={setAccepted} disabled={submitting} />

          <RecaptchaCheckbox onTokenChange={handleCaptchaChange} disabled={submitting} />

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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className={marketingAtelierButtonClass("lagoon")}
            >
              {submitting ? "Creating workspace…" : "Start free"}
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
