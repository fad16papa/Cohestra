"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
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
  LANDING_TESTIMONIALS,
} from "@/lib/marketing/landing-content";
import { LANDING_IMAGES } from "@/lib/marketing/landing-images";
import { resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const FLOAT_ROWS = [
  { name: "Elena M.", meta: "Sunday clinic", pill: "New" },
  { name: "Sam R.", meta: "Clinic, also board games", pill: "Returning" },
  { name: "Jordan K.", meta: "Youth open play", pill: "New" },
] as const;

const HERO_STATS = [
  { value: "Under 1 hr", label: "typical setup time" },
  { value: "1 list", label: "for all your activities" },
  { value: "0 apps", label: "for your clients to install" },
] as const;

const OUTREACH_POINTS = [
  "Open WhatsApp or Viber from any client profile",
  "Save each message on the client timeline",
  "Status flags so the team does not double message",
  "Dashboard shows who still needs a reply",
] as const;

const WEBSITE_POINTS = [
  "Homepage at your org subdomain on cohestra.app",
  "Upcoming activities update from your workspace",
  "Draft, preview, and publish without a developer",
  "Share kit with QR, link, and WhatsApp text to paste",
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
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14 lg:px-10 lg:pb-20 lg:pt-12">
        <div>
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
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6">
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

        <div className="marketing-product-lift relative">
          <figure className="relative aspect-[4/5] max-h-[640px] overflow-hidden rounded-[24px] shadow-[0_40px_80px_rgba(7,13,18,0.16)]">
            <Image
              src={LANDING_IMAGES.hero.src}
              alt={LANDING_IMAGES.hero.alt}
              fill
              priority
              className="object-cover saturate-[0.92] contrast-[1.05]"
              sizes="(max-width: 1024px) 100vw, 540px"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-ink/[0.05] to-ink/45"
            />
            <figcaption className="absolute inset-x-6 bottom-6 z-[2] text-paper">
              <span className="text-section mb-2 block text-gold">Sunday clinic</span>
              <span className="font-[family-name:var(--font-fraunces)] text-lg leading-snug tracking-[-0.02em]">
                New and returning clients in one list.
              </span>
            </figcaption>
          </figure>

          <aside
            aria-label="Live clients preview"
            className={cn(
              "absolute z-[3] w-[min(100%,300px)] rounded-[16px] border border-line bg-paper p-4 shadow-[0_28px_60px_rgba(7,13,18,0.2)]",
              "right-0 bottom-[18%] max-lg:relative max-lg:mx-4 max-lg:-mt-12 max-lg:mb-0 max-lg:w-auto max-lg:max-w-none"
            )}
          >
            <p className="text-label mb-3 text-gold">Tonight&apos;s clients</p>
            {FLOAT_ROWS.map((row) => (
              <div
                key={row.name}
                className="flex items-baseline justify-between border-t border-line py-2.5 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-stone">{row.meta}</p>
                </div>
                <span className="rounded-sm bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
                  {row.pill}
                </span>
              </div>
            ))}
          </aside>
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
                  className="group rounded-[16px] border border-line bg-paper p-6 transition-shadow hover:shadow-[0_20px_44px_rgba(7,13,18,0.08)]"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-[12px] bg-lagoon/10 text-lagoon">
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
              className="flex flex-col justify-between rounded-[16px] border border-lagoon/40 bg-lagoon/[0.06] p-6"
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

      {/* ── Product highlight: outreach ──────────────────────── */}
      <section className="border-t border-line bg-paper-warm">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">Client outreach</p>
            <h2 className="text-marketing-section mt-4 max-w-[16ch] text-ink">
              Message clients where they already are
            </h2>
            <p className="text-marketing-lead mt-4 max-w-[44ch] text-stone">
              WhatsApp and Viber open from the client profile. Cohestra logs what you sent so the
              team stays aligned.
            </p>
            <ul className="mt-8 space-y-3">
              {OUTREACH_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[0.95rem] text-ink/85">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lagoon/12 text-lagoon">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </MarketingReveal>

          <MarketingReveal delayMs={marketingRevealDelay(2)} className="relative">
            <figure className="relative aspect-[4/3] overflow-hidden rounded-[20px] shadow-[0_32px_64px_rgba(7,13,18,0.14)]">
              <Image
                src={LANDING_IMAGES.outreach.src}
                alt={LANDING_IMAGES.outreach.alt}
                fill
                className="object-cover saturate-[0.9]"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent" />
            </figure>
            <div className="absolute -bottom-5 left-5 z-[2] flex items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-3 shadow-[0_20px_44px_rgba(7,13,18,0.16)]">
              <span className="inline-flex size-2.5 rounded-full bg-lagoon" aria-hidden />
              <p className="text-sm font-medium text-ink">Saved on client timeline</p>
            </div>
          </MarketingReveal>
        </div>
      </section>

      {/* ── Product highlight: public site ───────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-24">
        <MarketingReveal delayMs={marketingRevealDelay(0)} className="relative lg:order-2">
          <figure className="relative aspect-[4/3] overflow-hidden rounded-[20px] shadow-[0_32px_64px_rgba(7,13,18,0.14)]">
            <Image
              src={LANDING_IMAGES.website.src}
              alt={LANDING_IMAGES.website.alt}
              fill
              className="object-cover saturate-[0.9]"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent" />
          </figure>
          <div className="absolute -bottom-5 right-5 z-[2] rounded-[14px] border border-line bg-paper px-4 py-3 shadow-[0_20px_44px_rgba(7,13,18,0.16)]">
            <p className="font-mono text-xs text-stone">yourclub.cohestra.app</p>
          </div>
        </MarketingReveal>

        <MarketingReveal delayMs={marketingRevealDelay(1)} className="lg:order-1">
          <p className="text-section text-gold">Public site</p>
          <h2 className="text-marketing-section mt-4 max-w-[16ch] text-ink">
            A public site tied to your activities
          </h2>
          <p className="text-marketing-lead mt-4 max-w-[44ch] text-stone">
            Your homepage stays current because activities and registration come from the same
            system.
          </p>
          <ul className="mt-8 space-y-3">
            {WEBSITE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[0.95rem] text-ink/85">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lagoon/12 text-lagoon">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </MarketingReveal>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-gold">From operators</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-paper">
              Used by clubs, workshops, and groups that run weekly sessions
            </h2>
          </MarketingReveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {LANDING_TESTIMONIALS.map((testimonial, index) => (
              <MarketingReveal
                key={testimonial.name}
                delayMs={marketingRevealDelay(index + 1)}
                className="flex h-full flex-col rounded-[16px] border border-paper/10 bg-paper/[0.04] p-6"
              >
                <blockquote className="flex-1 text-[0.98rem] leading-relaxed text-paper/85">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <footer className="mt-6 border-t border-paper/10 pt-4">
                  <p className="text-sm font-semibold text-paper">{testimonial.name}</p>
                  <p className="mt-0.5 text-xs text-paper/55">{testimonial.role}</p>
                </footer>
              </MarketingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <MarketingReveal delayMs={marketingRevealDelay(0)}>
          <p className="text-section text-gold">Pricing</p>
          <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
            Start free. Upgrade when you grow.
          </h2>
          <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
            Basic is free. Core and Pro include a 30 day trial. You are not charged until the trial
            ends.
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
                <div className="rounded-[14px] border border-line bg-paper p-5">
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
