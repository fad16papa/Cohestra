"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import { useAuth } from "@/components/auth/auth-provider";
import { createAuthSession, setAuthSession } from "@/lib/auth-storage";
import { fetchAdminProfile } from "@/lib/auth-api";
import {
  buildTenantDashboardUrl,
  resendSignupOtp,
  verifySignupEmail,
} from "@/lib/signup/signup-api";

function SignupVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applyProfile } = useAuth();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  const email = searchParams.get("email") ?? "";
  const tenantSlug = searchParams.get("slug") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email || !tenantSlug) {
      router.replace("/signup");
    }
  }, [email, router, tenantSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result = await verifySignupEmail({
      email,
      code: code.trim(),
      tenantSlug,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    const session = createAuthSession(
      result.result.accessToken,
      result.result.refreshToken,
      result.result.expiresInSeconds
    );
    setAuthSession(session);

    try {
      const profile = await fetchAdminProfile(session.accessToken);
      applyProfile(profile);
    } catch {
      applyProfile({
        userId: "pending",
        email,
        nickname: null,
        roles: ["TenantAdmin"],
        themePreference: "system",
        brandAccentColor: null,
      });
    }

    setSubmitting(false);
    window.location.href = buildTenantDashboardUrl(tenantSlug);
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const message = await resendSignupOtp({ email, tenantSlug });
      setInfo(message);
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : "Could not resend code."
      );
    } finally {
      setResending(false);
    }
  }

  if (!email || !tenantSlug) {
    return null;
  }

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto max-w-xl flex-1 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">Verify email</p>
          <h1 className="text-marketing-section mt-4 text-ink">Check your inbox</h1>
          <p className="text-marketing-lead mt-4 text-stone">
            We sent a 6-digit code to <span className="font-medium text-ink">{email}</span> for workspace{" "}
            <span className="font-medium text-ink">{tenantSlug}</span>.
          </p>
        </MarketingReveal>

        <MarketingReveal delayMs={160} className="mt-10 rounded-[16px] border border-line bg-paper-warm p-6">
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-ink">
                Verification code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm tracking-widest text-ink"
                disabled={submitting}
              />
            </div>

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
                type="submit"
                disabled={submitting || code.trim().length < 6}
                className={marketingAtelierButtonClass("lagoon")}
              >
                {submitting ? "Verifying…" : "Open dashboard"}
              </button>
              <button
                type="button"
                disabled={resending}
                onClick={() => void handleResend()}
                className={marketingAtelierButtonClass("ghost")}
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-sm text-stone">
            Wrong details?{" "}
            <Link href="/signup" className="text-lagoon hover:text-ink">
              Start over
            </Link>
          </p>
        </MarketingReveal>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}

export function SignupVerifyPageContent() {
  return (
    <Suspense fallback={null}>
      <SignupVerifyContent />
    </Suspense>
  );
}
