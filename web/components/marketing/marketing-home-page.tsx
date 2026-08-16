"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
  marketingCardClass,
} from "@/components/marketing/marketing-shell";
import { MarketingAmbientScene } from "@/components/marketing/marketing-ambient-scene";
import { MarketingHeroProductStack } from "@/components/marketing/marketing-hero-product-stack";
import { MarketingProductCarousel } from "@/components/marketing/marketing-product-carousel";
import {
  MarketingReveal,
  marketingRevealDelay,
} from "@/components/marketing/marketing-reveal";
import {
  PricingIntervalToggle,
  PricingPlanGrid,
  type PricingInterval,
} from "@/components/marketing/marketing-pricing-cards";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  LANDING_AUDIENCES,
  LANDING_FAQ,
  LANDING_FEATURES,
  LANDING_STEPS,
  LANDING_OUTCOMES,
} from "@/lib/marketing/landing-content";
import { PRODUCT_DOCS_START_PATHS } from "@/lib/marketing/product-docs-content";
import { PRICING_POSITIONING_LINE } from "@/lib/marketing/pricing-plans";
import { resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const HERO_STATS = [
  { value: "Under 1 hr", label: "typical setup time" },
  { value: "1 list", label: "for all your activities" },
  { value: "0 apps", label: "for your clients to install" },
] as const;

export function MarketingHomePage() {
  const { status, profile } = useAuth();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const [interval, setInterval] = useState<PricingInterval>("monthly");

  useEffect(() => {
    if (status === "authenticated" && profile) {
      window.location.replace(resolvePostLoginPath(profile));
    }
  }, [profile, status]);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:items-stretch lg:gap-12 lg:px-10 lg:pb-20 lg:pt-12">
        <MarketingAmbientScene variant="hero" className="opacity-80" />
        <div className="relative z-[1]">
          <MarketingReveal immediate delayMs={50}>
            <p className="text-section text-gold">Community operations software</p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={120}>
            <h1 className="text-marketing-hero mt-5 text-balance text-ink">
              Registrations, client list, and follow up in one place
            </h1>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={300}>
            <p className="text-marketing-lead mt-6 max-w-[42ch] text-stone">
              Cohestra replaces the forms, spreadsheets, and link in bio stack most clubs, workshops,
              and groups patch together. Publish activities, collect registrations by QR, keep one
              client list, and message people on WhatsApp or Viber from the same workspace.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={380}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
                Start free
              </Link>
              <Link href="#pricing" className={marketingAtelierButtonClass("ghost")}>
                See pricing
              </Link>
            </div>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={450}>
            <p className="mt-4 text-sm text-stone">
              Free on Basic. No credit card. Most teams publish their first activity the same day.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={520}>
            <dl className="mt-10 grid grid-cols-3 gap-2 border-t border-line pt-6 sm:gap-4">
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-ink sm:text-2xl">
                    {stat.value}
                  </dd>
                  <dd className="mt-1 text-xs leading-snug text-stone">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </MarketingReveal>
        </div>

        <div className="relative z-[1]">
        <MarketingHeroProductStack />
        </div>
      </section>

      {/* ── Audience strip ───────────────────────────────────── */}
      <section aria-label="Who Cohestra is for" className="border-y border-line bg-paper-warm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8 lg:px-10">
          <p className="text-section text-stone">Built for</p>
          {LANDING_AUDIENCES.map((audience) => (
            <span
              key={audience.label}
              className="text-sm font-medium tracking-tight text-ink/70"
            >
              {audience.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Problem / positioning ────────────────────────────── */}
      <section
        id="atelier"
        className="mx-auto max-w-6xl scroll-mt-28 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">Why Cohestra</p>
            <h2 className="text-marketing-section mt-4 max-w-[16ch] text-ink">
              One workspace instead of five tools
            </h2>
          </MarketingReveal>
          <MarketingReveal delayMs={marketingRevealDelay(1)}>
            <p className="max-w-[42ch] text-[1.05rem] leading-relaxed text-stone">
              Most clubs, workshops, and groups run on Google Forms, a spreadsheet, a link in bio,
              group chat follow ups, and maybe Mailchimp. Cohestra puts registration, the client
              list, messaging notes, email, and your public page in one product you do not have to
              rebuild every week.
            </p>
          </MarketingReveal>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-12">
          {[
            {
              eyebrow: "Instead of Google Forms",
              title: "Registration that sticks",
              description:
                "Each signup gets a number and confirmation email. Names stay in Cohestra, not a sheet you lose track of.",
            },
            {
              eyebrow: "Instead of spreadsheets",
              title: "One profile per person",
              description:
                "See who came back across activities without VLOOKUPs or copy paste between tabs.",
            },
            {
              eyebrow: "Instead of link in bio",
              title: "A public page that registers",
              description:
                "Share one URL. Every signup lands in your workspace, not a form that exports nowhere.",
            },
          ].map((cell, index) => (
            <MarketingReveal key={cell.title} delayMs={marketingRevealDelay(index + 2)}>
              <p className="text-section mb-3 text-gold">{cell.eyebrow}</p>
              <h3 className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.025em] text-ink">
                {cell.title}
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-stone">{cell.description}</p>
            </MarketingReveal>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────── */}
      <section id="features" className="scroll-mt-24 border-t border-line bg-paper-warm">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">What is included</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
              Built for clubs, workshops, and groups
            </h2>
            <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
              Activities, registration, client history, messaging, reports, and a public site. No
              plugins and no Zapier required.
            </p>
          </MarketingReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <MarketingReveal
                  key={feature.title}
                  delayMs={marketingRevealDelay(index, 80, 45)}
                  className={marketingCardClass("default", "p-6")}
                >
                  <span className="marketing-card-icon inline-flex size-11 items-center justify-center rounded-[12px] bg-lagoon/10 text-lagoon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.2rem] font-medium tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{feature.description}</p>
                </MarketingReveal>
              );
            })}
            <MarketingReveal
              delayMs={marketingRevealDelay(LANDING_FEATURES.length, 80, 45)}
              className={marketingCardClass("accent", "flex flex-col justify-between p-6")}
            >
              <div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-[1.2rem] font-medium tracking-[-0.02em] text-ink">
                  More shipping regularly
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">
                  Capacity limits, share kits, team invites, and per org email branding are live
                  today. We add operator requests on a steady cadence.
                </p>
              </div>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-lagoon-deep"
              >
                Start exploring free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </MarketingReveal>
          </div>
        </div>
      </section>

      <section id="document" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">Document</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
              The official Cohestra user manual
            </h2>
            <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
              Short sentences. Numbered steps. The same kind of guide modern products keep next to
              Features — so you can run an event without guessing.
            </p>
          </MarketingReveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_DOCS_START_PATHS.map((path, index) => (
              <MarketingReveal
                key={path.href}
                delayMs={marketingRevealDelay(index + 1, 80, 40)}
              >
                <Link
                  href={path.href}
                  className={marketingCardClass(
                    "default",
                    "flex h-full flex-col p-5 hover:border-lagoon/40"
                  )}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-lagoon/10 text-lagoon">
                    <BookOpen className="size-4" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.15rem] font-medium tracking-[-0.02em] text-ink">
                    {path.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-stone">{path.detail}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon">
                    Open chapter
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </MarketingReveal>
            ))}
          </div>

          <MarketingReveal delayMs={marketingRevealDelay(6)} className="mt-8">
            <Link href="/docs" className={marketingAtelierButtonClass("lagoon")}>
              Open the full Document
            </Link>
          </MarketingReveal>
        </div>
      </section>

      <MarketingProductCarousel />

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <MarketingReveal delayMs={marketingRevealDelay(0)}>
          <p className="text-section text-gold">How it works</p>
          <h2 className="text-marketing-section mt-4 max-w-[16ch] text-ink">
            Set up before your next event
          </h2>
        </MarketingReveal>

        <ol className="mt-12 grid gap-8 lg:grid-cols-3">
          {LANDING_STEPS.map((step, index) => (
            <MarketingReveal
              key={step.step}
              as="li"
              delayMs={marketingRevealDelay(index + 1)}
              className="relative border-t border-line pt-7"
            >
              <span className="font-[family-name:var(--font-fraunces)] text-[2.6rem] font-medium leading-none tracking-[-0.04em] text-lagoon/25">
                {step.step}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.3rem] font-medium tracking-[-0.02em] text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-stone">{step.description}</p>
            </MarketingReveal>
          ))}
        </ol>
      </section>

      {/* ── Operator outcomes ─────────────────────────────────── */}
      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">Why operators switch</p>
            <h2 className="text-marketing-section mt-4 max-w-[22ch] text-paper">
              Built for clubs, workshops, and groups that run weekly sessions
            </h2>
          </MarketingReveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {LANDING_OUTCOMES.map((outcome, index) => (
              <MarketingReveal
                key={outcome.headline}
                delayMs={marketingRevealDelay(index + 1)}
                className={marketingCardClass("dark", "flex h-full flex-col p-6")}
              >
                <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-paper">
                  {outcome.headline}
                </h3>
                <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed text-paper/80">
                  {outcome.description}
                </p>
              </MarketingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section
        id="pricing"
        className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <MarketingAmbientScene variant="pricing" className="opacity-60" />
        <div className="relative z-[1]">
        <MarketingReveal delayMs={marketingRevealDelay(0)}>
          <p className="text-section text-gold">Pricing</p>
          <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
            Start free. Upgrade when you grow.
          </h2>
          <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
            Basic is free. Core and Pro include a 30 day trial. You are not charged until the trial
            ends.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium text-lagoon">
            {PRICING_POSITIONING_LINE}
          </p>
        </MarketingReveal>

        <MarketingReveal delayMs={140} className="mt-8">
          <PricingIntervalToggle interval={interval} onChange={setInterval} />
        </MarketingReveal>

        <div className="mt-10">
          <PricingPlanGrid interval={interval} />
        </div>

        <MarketingReveal delayMs={marketingRevealDelay(5)} className="mt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-lagoon-deep"
          >
            Compare all plan features
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </MarketingReveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-line bg-paper-warm">
        <div className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">FAQ</p>
            <h2 className="text-marketing-section mt-4 text-ink">Questions, answered</h2>
          </MarketingReveal>

          <dl className="mt-10 space-y-6">
            {LANDING_FAQ.map((item, index) => (
              <MarketingReveal key={item.question} delayMs={marketingRevealDelay(index + 1)}>
                <div className={marketingCardClass("default", "p-5")}>
                  <dt className="font-semibold text-ink">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-stone">{item.answer}</dd>
                </div>
              </MarketingReveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal
            delayMs={marketingRevealDelay(0)}
            className="rounded-[24px] bg-ink px-6 py-12 text-center sm:px-12 lg:py-16"
          >
            <p className="text-section text-gold">Ready when you are</p>
            <h2 className="text-marketing-section mx-auto mt-4 max-w-[20ch] text-balance text-paper">
              Publish your next activity today
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-[1.02rem] leading-relaxed text-paper/70">
              Create a free account, publish an activity, and share the QR with your group.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
                Start free
              </Link>
              <Link
                href="/login"
                className={cn(
                  "marketing-atelier-btn inline-flex h-12 items-center justify-center rounded-[10px] border border-paper/25 bg-transparent px-5 text-sm font-semibold text-paper hover:border-paper/50 hover:bg-paper/5"
                )}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-paper/50">
              Free on Basic. 30 day trials on Core and Pro.
            </p>
          </MarketingReveal>
        </div>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
