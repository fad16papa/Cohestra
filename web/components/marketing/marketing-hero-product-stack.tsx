"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { BarChart3, LayoutDashboard, Mail } from "lucide-react";

import { LANDING_IMAGES } from "@/lib/marketing/landing-images";
import { cn } from "@/lib/utils";

const FLOAT_ROWS = [
  { name: "Elena M.", meta: "Sunday clinic", pill: "New" },
  { name: "Sam R.", meta: "Clinic, also board games", pill: "Returning" },
  { name: "Jordan K.", meta: "Youth open play", pill: "New" },
] as const;

/** Bottom-anchored offsets: each layer stacks upward from the photo base. */
const STACK_LAYERS = {
  dashboard: {
    bottom: "bottom-[2.5rem] sm:bottom-[3rem]",
    left: "left-0",
    width: "w-[90%]",
    zIndex: 2,
  },
  campaigns: {
    bottom: "bottom-[9.5rem] sm:bottom-[10.5rem]",
    left: "left-[5%] sm:left-[6%]",
    width: "w-[90%]",
    zIndex: 3,
  },
  reports: {
    bottom: "bottom-[16.5rem] sm:bottom-[18rem]",
    left: "left-[10%] sm:left-[12%]",
    width: "w-[90%]",
    zIndex: 4,
  },
} as const;

function StackBrowserChrome({
  path,
  children,
  className,
}: {
  path: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-[18px] border border-line bg-paper shadow-[0_24px_48px_rgba(7,13,18,0.12)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-line bg-paper-warm px-4 py-2.5">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate font-mono text-[0.625rem] text-stone sm:text-[0.7rem]">
          {path}
        </span>
      </div>
      <div className="bg-paper-warm/40 p-3 sm:p-4">{children}</div>
    </div>
  );
}

function StackLabel({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[0.625rem] font-semibold tracking-wide text-ink uppercase shadow-[0_8px_20px_rgba(7,13,18,0.08)]",
        className
      )}
    >
      <Icon className="size-3 text-lagoon" aria-hidden />
      {label}
    </span>
  );
}

function DashboardStackMock() {
  const metrics = [
    { value: "248", label: "Total leads" },
    { value: "36", label: "Registrations this week" },
    { value: "82%", label: "Follow-up coverage" },
  ] as const;

  return (
    <StackBrowserChrome
      path="yourclub.cohestra.app/dashboard"
      className="shadow-[0_40px_80px_rgba(7,13,18,0.16)]"
    >
      <div className="space-y-2.5">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-base font-medium tracking-[-0.02em] text-ink sm:text-lg">
            Good morning, Alex
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-stone sm:text-xs">
            Sunday clinic tonight — 12 registered.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[10px] border border-line bg-paper px-2 py-2 sm:px-2.5 sm:py-2.5"
            >
              <p className="font-[family-name:var(--font-fraunces)] text-base font-medium tracking-[-0.02em] text-ink sm:text-lg">
                {metric.value}
              </p>
              <p className="mt-0.5 text-[0.5625rem] leading-snug text-stone sm:text-[0.625rem]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-line bg-paper px-2.5 py-2 sm:p-3">
          <p className="text-[0.625rem] font-semibold tracking-wide text-gold uppercase">
            Needs follow-up
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[0.6875rem] sm:text-xs">
            <span className="font-medium text-ink">Jordan K.</span>
            <span className="rounded-sm bg-lagoon/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide text-lagoon uppercase">
              New
            </span>
          </div>
        </div>
      </div>
    </StackBrowserChrome>
  );
}

function CampaignsStackMock() {
  const rows = [
    { subject: "Sunday clinic reminder", sent: "Mar 8" },
    { subject: "New board games night", sent: "Mar 5" },
  ] as const;

  return (
    <StackBrowserChrome path="yourclub.cohestra.app/campaigns">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-sm font-medium tracking-[-0.02em] text-ink sm:text-base">
              Campaigns
            </p>
            <p className="mt-0.5 text-[0.625rem] text-stone sm:text-[0.6875rem]">
              Segmented email with delivery tracking
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] bg-lagoon px-2 py-1 text-[0.625rem] font-semibold text-paper">
            New
          </span>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-line bg-paper">
          <div className="grid grid-cols-[1.4fr_0.6fr_0.5fr] gap-2 border-b border-line bg-paper-warm px-2.5 py-1.5 text-[0.5625rem] font-semibold tracking-wide text-stone uppercase">
            <span>Subject</span>
            <span>Sent</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.subject}
              className="grid grid-cols-[1.4fr_0.6fr_0.5fr] gap-2 border-b border-line px-2.5 py-2 text-[0.625rem] last:border-b-0 sm:text-[0.6875rem]"
            >
              <span className="truncate font-medium text-ink">{row.subject}</span>
              <span className="text-stone">{row.sent}</span>
              <span className="font-semibold text-lagoon">Delivered</span>
            </div>
          ))}
        </div>
      </div>
    </StackBrowserChrome>
  );
}

function ReportsStackMock() {
  const filters = ["Last 7 days", "All activities", "All statuses"] as const;
  const summary = [
    { label: "Registrations", value: "36" },
    { label: "Unique clients", value: "28" },
    { label: "Top activity", value: "Sunday clinic" },
  ] as const;

  return (
    <StackBrowserChrome path="yourclub.cohestra.app/reports">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-sm font-medium tracking-[-0.02em] text-ink sm:text-base">
              Reports
            </p>
            <p className="mt-0.5 text-[0.625rem] text-stone sm:text-[0.6875rem]">
              Filter, compare, and export CSV
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] border border-line bg-paper px-2 py-1 text-[0.625rem] font-semibold text-ink">
            Export
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter, index) => (
            <span
              key={filter}
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.5625rem] font-medium sm:text-[0.625rem]",
                index === 0
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-stone"
              )}
            >
              {filter}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-[8px] border border-line bg-paper px-2 py-1.5"
            >
              <p className="text-[0.5625rem] text-stone sm:text-[0.625rem]">{item.label}</p>
              <p className="mt-0.5 truncate font-[family-name:var(--font-fraunces)] text-xs font-medium text-ink sm:text-sm">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex h-9 items-end gap-1 rounded-[8px] border border-line bg-paper px-2 py-1.5 sm:h-10">
          {[42, 58, 36, 72, 48, 64, 36].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-sm bg-lagoon/20"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </StackBrowserChrome>
  );
}

type StackLayerKey = keyof typeof STACK_LAYERS;

type LadderCardProps = {
  children: ReactNode;
  label: string;
  icon: typeof LayoutDashboard;
  layer: StackLayerKey;
  labelClassName: string;
  animationOrder: number;
};

function LadderCard({
  children,
  label,
  icon,
  layer,
  labelClassName,
  animationOrder,
}: LadderCardProps) {
  const position = STACK_LAYERS[layer];

  return (
    <div
      className={cn(
        "marketing-hero-stack-card absolute",
        position.bottom,
        position.left,
        position.width
      )}
      style={{ zIndex: position.zIndex, animationDelay: `${0.35 + animationOrder * 0.2}s` }}
    >
      <div className="relative">
        {children}
        <StackLabel icon={icon} label={label} className={labelClassName} />
      </div>
    </div>
  );
}

function HeroCommunityPhoto() {
  return (
    <figure className="absolute inset-x-0 bottom-0 z-[1] aspect-[4/5] max-h-[480px] overflow-hidden rounded-[24px] shadow-[0_40px_80px_rgba(7,13,18,0.16)]">
      <Image
        src={LANDING_IMAGES.hero.src}
        alt={LANDING_IMAGES.hero.alt}
        fill
        priority
        className="object-cover saturate-[0.92] contrast-[1.05]"
        sizes="(max-width: 1024px) 100vw, 560px"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/[0.04] via-ink/15 to-ink/55" />
      <figcaption className="absolute inset-x-5 bottom-5 z-[2] max-w-[18ch] text-paper sm:inset-x-6 sm:bottom-6">
        <span className="text-section mb-2 block text-gold">Sunday clinic</span>
        <span className="font-[family-name:var(--font-fraunces)] text-base leading-snug tracking-[-0.02em] sm:text-lg">
          New and returning clients in one list.
        </span>
      </figcaption>
    </figure>
  );
}

function HeroClientsPreview() {
  return (
    <aside
      aria-label="Live clients preview"
      className={cn(
        "absolute z-[6] w-[min(100%,260px)] rounded-[16px] border border-line bg-paper p-4 shadow-[0_28px_60px_rgba(7,13,18,0.2)]",
        "right-2 bottom-[21rem] sm:right-4 sm:bottom-[24rem]"
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
  );
}

export function MarketingHeroProductStack({ className }: { className?: string }) {
  return (
    <div
      className={cn("marketing-product-lift relative mx-auto w-full max-w-[560px]", className)}
      aria-label="Cohestra community photo with dashboard, email campaigns, and reports previews"
    >
      <div className="relative h-[34rem] sm:h-[36rem]">
        <HeroCommunityPhoto />

        <LadderCard
          layer="dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          animationOrder={0}
          labelClassName="absolute -right-1 -bottom-3 sm:-right-2 sm:-bottom-4"
        >
          <DashboardStackMock />
        </LadderCard>

        <LadderCard
          layer="campaigns"
          label="Campaigns"
          icon={Mail}
          animationOrder={1}
          labelClassName="absolute -left-1 top-3 sm:-left-2 sm:top-4"
        >
          <CampaignsStackMock />
        </LadderCard>

        <LadderCard
          layer="reports"
          label="Reports"
          icon={BarChart3}
          animationOrder={2}
          labelClassName="absolute -right-1 top-3 sm:-right-2 sm:top-4"
        >
          <ReportsStackMock />
        </LadderCard>

        <HeroClientsPreview />
      </div>

      <p className="mx-auto mt-4 max-w-[36ch] text-center text-sm leading-relaxed text-stone">
        Real community moments plus dashboard, campaigns, and reports in one workspace.
      </p>
    </div>
  );
}
