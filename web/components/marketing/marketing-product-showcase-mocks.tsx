"use client";

import type { ReactNode } from "react";

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
