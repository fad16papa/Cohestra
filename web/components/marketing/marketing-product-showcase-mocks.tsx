"use client";

import type { ReactNode } from "react";

import {
  ViberBrandIcon,
  WhatsAppBrandIcon,
} from "@/components/shared/messenger-brand-icons";
import { cn } from "@/lib/utils";

export function ShowcaseBrowserChrome({
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
        "overflow-hidden rounded-[18px] border border-line bg-paper shadow-[0_32px_64px_rgba(7,13,18,0.14)]",
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
      <div className="bg-paper-warm/40 p-3 sm:p-5">{children}</div>
    </div>
  );
}

export function DashboardShowcaseMock() {
  const metrics = [
    { value: "248", label: "Total leads" },
    { value: "36", label: "Registrations this week" },
    { value: "4", label: "Active activities" },
    { value: "82%", label: "Follow-up coverage" },
  ] as const;

  const queue = [
    { name: "Jordan K.", tag: "New" },
    { name: "Sam R.", tag: "Returning" },
  ] as const;

  return (
    <ShowcaseBrowserChrome path="yourclub.cohestra.app/dashboard">
      <div className="space-y-4">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
            Good morning, Alex
          </p>
          <p className="mt-1 text-sm text-stone">
            Sunday clinic is tonight — 12 registered so far.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[10px] border border-line bg-paper px-3 py-3"
            >
              <p className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-ink">
                {metric.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-stone">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-line bg-paper p-4">
          <p className="text-[0.6875rem] font-semibold tracking-wide text-gold uppercase">
            Needs follow-up
          </p>
          <ul className="mt-3 space-y-2">
            {queue.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-ink">{row.name}</span>
                <span className="rounded-sm bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
                  {row.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ShowcaseBrowserChrome>
  );
}

export function CampaignsShowcaseMock() {
  const rows = [
    { subject: "Sunday clinic reminder", sent: "Mar 8" },
    { subject: "New board games night", sent: "Mar 5" },
    { subject: "Summer camp early access", sent: "Feb 28" },
  ] as const;

  return (
    <ShowcaseBrowserChrome path="yourclub.cohestra.app/campaigns">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
              Campaigns
            </p>
            <p className="mt-1 text-sm text-stone">
              Segmented email with delivery tracking
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] bg-lagoon px-3 py-1.5 text-xs font-semibold text-paper">
            New campaign
          </span>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-line bg-paper">
          <div className="grid grid-cols-[1.4fr_0.6fr_0.5fr] gap-3 border-b border-line bg-paper-warm px-4 py-2.5 text-[0.6875rem] font-semibold tracking-wide text-stone uppercase">
            <span>Subject</span>
            <span>Sent</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.subject}
              className="grid grid-cols-[1.4fr_0.6fr_0.5fr] gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0"
            >
              <span className="truncate font-medium text-ink">{row.subject}</span>
              <span className="text-stone">{row.sent}</span>
              <span className="font-semibold text-lagoon">Delivered</span>
            </div>
          ))}
        </div>
      </div>
    </ShowcaseBrowserChrome>
  );
}

export function OutreachShowcaseMock() {
  const channels = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      preview: "Hi Jordan — reminder for Sunday clinic at 6pm. See you there!",
      logged: "Logged on timeline · Mar 9",
    },
    {
      id: "viber",
      label: "Viber",
      preview: "Thanks for signing up for youth open play. Reply if you need directions.",
      logged: "Logged on timeline · Mar 10",
    },
  ] as const;

  return (
    <ShowcaseBrowserChrome path="yourclub.cohestra.app/clients/jordan-kim">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
              Jordan Kim
            </p>
            <p className="mt-1 text-sm text-stone">South Korea · Contacted</p>
          </div>
          <span className="rounded-full bg-gold/12 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-gold uppercase">
            Needs follow-up
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-lagoon/25 bg-lagoon/10 text-sm font-semibold text-lagoon">
            <WhatsAppBrandIcon />
            WhatsApp
          </span>
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#7360f2]/25 bg-[#7360f2]/10 text-sm font-semibold text-[#7360f2]">
            <ViberBrandIcon />
            Viber
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-[12px] border border-line bg-paper p-3.5"
            >
              <div className="flex items-center gap-2">
                {channel.id === "whatsapp" ? (
                  <WhatsAppBrandIcon className="text-lagoon" />
                ) : (
                  <ViberBrandIcon className="text-[#7360f2]" />
                )}
                <p className="text-xs font-semibold tracking-wide text-stone uppercase">
                  {channel.label}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/90">
                &ldquo;{channel.preview}&rdquo;
              </p>
              <p className="mt-2 text-xs text-stone">{channel.logged}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-line bg-paper p-4">
          <p className="text-[0.6875rem] font-semibold tracking-wide text-stone uppercase">
            Relationship timeline
          </p>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-2 text-ink/85">
              <span className="size-2 shrink-0 rounded-full bg-lagoon" aria-hidden />
              WhatsApp message logged · Welcome note sent
            </li>
            <li className="flex items-center gap-2 text-ink/85">
              <span className="size-2 shrink-0 rounded-full bg-[#7360f2]" aria-hidden />
              Viber chat opened · Clinic reminder
            </li>
            <li className="flex items-center gap-2 text-ink/85">
              <span className="size-2 shrink-0 rounded-full bg-line-strong" aria-hidden />
              Status changed to Contacted
            </li>
          </ul>
        </div>
      </div>
    </ShowcaseBrowserChrome>
  );
}

export function WebsiteBuilderShowcaseMock() {
  const sections = ["Hero", "Highlights", "Upcoming activities", "Testimonials"] as const;

  return (
    <ShowcaseBrowserChrome path="yourclub.cohestra.app/dashboard/website">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
                Website builder
              </p>
              <span className="rounded-full bg-ink px-2.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-paper uppercase">
                Pro
              </span>
            </div>
            <p className="mt-1 text-sm text-stone">
              Draft, preview, and publish your public homepage
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] bg-lagoon px-3 py-1.5 text-xs font-semibold text-paper">
            Publish
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {["Design", "Sections", "Templates"].map((tab, index) => (
            <span
              key={tab}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                index === 0
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-stone"
              )}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-3 rounded-[10px] border border-line bg-paper p-3.5">
            <p className="text-[0.6875rem] font-semibold tracking-wide text-stone uppercase">
              Sections
            </p>
            <ul className="space-y-2">
              {sections.map((section, index) => (
                <li
                  key={section}
                  className={cn(
                    "rounded-[8px] border px-3 py-2 text-sm",
                    index === 0
                      ? "border-lagoon/30 bg-lagoon/5 font-medium text-ink"
                      : "border-line text-stone"
                  )}
                >
                  {section}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-line bg-paper">
            <div className="border-b border-line bg-paper-warm px-3 py-2 text-[0.625rem] font-medium text-stone">
              Live preview · Desktop
            </div>
            <div className="space-y-2 p-3">
              <div className="rounded-[8px] bg-lagoon/10 px-3 py-4">
                <p className="font-[family-name:var(--font-fraunces)] text-sm font-medium text-ink">
                  Sunday clinic &amp; open play
                </p>
                <p className="mt-1 text-xs text-stone">Your club homepage hero</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[6px] border border-line px-2 py-2 text-xs text-stone">
                  QR registration
                </div>
                <div className="rounded-[6px] border border-line px-2 py-2 text-xs text-stone">
                  WhatsApp share
                </div>
              </div>
              <div className="rounded-[8px] border border-line px-3 py-2.5">
                <p className="text-[0.625rem] font-semibold tracking-wide text-gold uppercase">
                  Upcoming
                </p>
                <p className="mt-1 text-xs text-ink">Sunday clinic · Board games night</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShowcaseBrowserChrome>
  );
}

export function ReportsShowcaseMock() {
  const filters = ["Last 7 days", "All activities", "All statuses"] as const;
  const summary = [
    { label: "Registrations", value: "36" },
    { label: "Unique clients", value: "28" },
    { label: "Top activity", value: "Sunday clinic" },
  ] as const;

  return (
    <ShowcaseBrowserChrome path="yourclub.cohestra.app/reports">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
              Reports
            </p>
            <p className="mt-1 text-sm text-stone">Filter, compare, and export CSV</p>
          </div>
          <span className="shrink-0 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            Export CSV
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <span
              key={filter}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                index === 0
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-stone"
              )}
            >
              {filter}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-[10px] border border-line bg-paper px-3 py-2.5"
            >
              <p className="text-xs text-stone">{item.label}</p>
              <p className="mt-1 truncate font-[family-name:var(--font-fraunces)] text-base font-medium text-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex h-12 items-end gap-1.5 rounded-[10px] border border-line bg-paper px-3 py-2">
          {[42, 58, 36, 72, 48, 64, 36].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-sm bg-lagoon/20"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </ShowcaseBrowserChrome>
  );
}
