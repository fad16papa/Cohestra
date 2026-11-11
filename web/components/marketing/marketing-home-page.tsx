"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
  marketingCardClass,
} from "@/components/marketing/marketing-shell";
import { MarketingAmbientScene } from "@/components/marketing/marketing-ambient-scene";
import { MarketingHeroProductStack } from "@/components/marketing/marketing-hero-product-stack";
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
import { PRICING_POSITIONING_LINE } from "@/lib/marketing/pricing-plans";
import { resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const HERO_PLAN_FACTS = [
  { value: "Basic", label: "Free. No card." },
  { value: "Core", label: "Website Studio" },
  { value: "Pro", label: "Campaigns" },
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
    <MarketingShell scrolled={scrolled} showAmbient={false}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="relative mx-auto grid max-w-6xl gap-8 px-5 pb-14 pt-6 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-10 lg:pb-16 lg:pt-8">
        <MarketingAmbientScene variant="hero" className="opacity-80" />
        <div className="relative z-[1]">
          <MarketingReveal immediate delayMs={50}>
            <p className="text-section text-text-accent">Community operations</p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={120}>
            <h1 className="mt-3 text-balance font-[family-name:var(--font-fraunces)] text-[clamp(2.35rem,4.4vw,3.65rem)] font-medium leading-[1.08] tracking-[-0.04em] text-ink">
              Registration, clients, and follow-up in one workspace
            </h1>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={300}>
            <p className="text-marketing-lead mt-4 max-w-[46ch] text-muted-foreground">
              Cohestra is the operator workspace for activities and public registration. Signups
              become clients. Follow-up, Analytics, and Cohestra AI stay on that list. Form Studio
              composes the form. Website Studio is on Core. Campaigns are on Pro.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={380}>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
                Start free
              </Link>
              <Link href="#pricing" className={marketingAtelierButtonClass("ghost")}>
                See pricing
              </Link>
            </div>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={450}>
            <p className="mt-4 max-w-[46ch] text-sm text-muted-foreground">
              Basic is free. No credit card. Core and Pro include a 30-day trial and are not charged
              until the trial ends.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={520}>
            <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5 sm:gap-4">
              {HERO_PLAN_FACTS.map((fact) => (
                <div key={fact.value}>
                  <dt className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-ink sm:text-2xl">
                    {fact.value}
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-muted-foreground">{fact.label}</dd>
                </div>
              ))}
            </dl>
          </MarketingReveal>
        </div>

        <div className="relative z-[1] min-w-0">
          <MarketingHeroProductStack />
        </div>
      </section>

      <section aria-label="Who Cohestra is for" className="border-y border-line bg-paper-warm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8 lg:px-10">
          <p className="text-section text-text-accent">Built for</p>
          {LANDING_AUDIENCES.map((audience) => (
            <span key={audience.label} className="text-sm font-medium tracking-tight text-ink">
              {audience.label}
            </span>
          ))}
        </div>
      </section>

      <section
        id="atelier"
        className="mx-auto max-w-6xl scroll-mt-28 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">Why Cohestra</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
              The list does not leave the product
            </h2>
          </MarketingReveal>
          <MarketingReveal delayMs={marketingRevealDelay(1)}>
            <p className="max-w-[46ch] text-[1.05rem] leading-relaxed text-muted-foreground">
              Registration, the client profile, follow-up notes, analytics, and the public page
              read the same workspace. Paid rooms stay in the navigation and name the plan instead
              of disappearing.
            </p>
          </MarketingReveal>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-12">
          {[
            {
              eyebrow: "Activities and Form Studio",
              title: "Publish the form you meant",
              description:
                "The activity owns the registration form. Form Studio is where that form is composed, with recipe limits that match the plan.",
            },
            {
              eyebrow: "Registration and Clients",
              title: "One profile per person",
              description:
                "The public page and QR code write Clients. A person who comes back is still one profile, with history across activities.",
            },
            {
              eyebrow: "Follow-up, Analytics, AI",
              title: "The next reply stays in view",
              description:
                "Follow-up is a room. Analytics reports on the same list. Cohestra AI names a next action when the workspace has enough history, and says when it does not.",
            },
          ].map((cell, index) => (
            <MarketingReveal key={cell.title} delayMs={marketingRevealDelay(index + 2)}>
              <p className="text-section mb-3 text-text-accent">{cell.eyebrow}</p>
              <h3 className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.025em] text-ink">
                {cell.title}
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                {cell.description}
              </p>
            </MarketingReveal>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-t border-line bg-paper-warm">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">What is included</p>
            <h2 className="text-marketing-section mt-4 max-w-[20ch] text-ink">
              Nine parts of one workspace
            </h2>
            <p className="text-marketing-lead mt-4 max-w-2xl text-muted-foreground">
              Activities, Registration, Clients, Follow-up, Form Studio, Website Studio, Analytics,
              Campaigns, and Cohestra AI. Locks name Core or Pro where the room is paid.
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
                  <p className="mt-4 text-label text-text-accent">{feature.plan}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.2rem] font-medium tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </MarketingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <MarketingReveal delayMs={marketingRevealDelay(0)}>
          <p className="text-section text-text-accent">How it works</p>
          <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
            Publish, register, then follow up
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
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </MarketingReveal>
          ))}
        </ol>
      </section>

      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">How the workspace holds together</p>
            <h2 className="text-marketing-section mt-4 max-w-[22ch] text-paper">
              The same people, from the QR code to the next reply
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
                <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed text-paper/85">
                  {outcome.description}
                </p>
              </MarketingReveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <MarketingAmbientScene variant="pricing" className="opacity-60" />
        <div className="relative z-[1]">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">Pricing</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
              Start free. Upgrade when you grow.
            </h2>
            <p className="text-marketing-lead mt-4 max-w-2xl text-muted-foreground">
              Basic is free. Core and Pro include a 30-day trial. You are not charged until the
              trial ends.
            </p>
            <p className="mt-3 max-w-2xl text-sm font-medium text-lagoon">{PRICING_POSITIONING_LINE}</p>
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

      <section id="faq" className="border-t border-line bg-paper-warm">
        <div className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">FAQ</p>
            <h2 className="text-marketing-section mt-4 text-ink">Questions, answered</h2>
          </MarketingReveal>

          <dl className="mt-10 space-y-6">
            {LANDING_FAQ.map((item, index) => (
              <MarketingReveal key={item.question} delayMs={marketingRevealDelay(index + 1)}>
                <div className={marketingCardClass("default", "p-5")}>
                  <dt className="font-semibold text-ink">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
                </div>
              </MarketingReveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal
            delayMs={marketingRevealDelay(0)}
            className="rounded-[24px] bg-ink px-6 py-12 text-center sm:px-12 lg:py-16"
          >
            <p className="text-section text-gold">Ready when you are</p>
            <h2 className="text-marketing-section mx-auto mt-4 max-w-[22ch] text-balance text-paper">
              Open a workspace and publish an activity
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[1.02rem] leading-relaxed text-paper/85">
              Create a free Basic account, verify your email, and share the registration page or QR
              code. Core and Pro trials wait until you choose them.
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
            <p className="mt-4 text-xs text-paper/70">
              Free on Basic. 30-day trials on Core and Pro.
            </p>
          </MarketingReveal>
        </div>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
