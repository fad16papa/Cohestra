"use client";

import type { ReactNode } from "react";
import { BarChart3, LayoutDashboard, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

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
    { value: "4", label: "Active activities" },
    { value: "82%", label: "Follow-up coverage" },
  ] as const;

  const queue = [
    { name: "Jordan K.", tag: "New" },
    { name: "Sam R.", tag: "Returning" },
  ] as const;

  return (
    <StackBrowserChrome
      path="yourclub.cohestra.app/dashboard"
      className="shadow-[0_40px_80px_rgba(7,13,18,0.16)]"
    >
      <div className="space-y-3">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-base font-medium tracking-[-0.02em] text-ink sm:text-lg">
            Good morning, Alex
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-stone sm:text-xs">
            Sunday clinic is tonight — 12 registered so far.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[10px] border border-line bg-paper px-2.5 py-2 sm:px-3 sm:py-2.5"
            >
              <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl">
                {metric.value}
              </p>
              <p className="mt-0.5 text-[0.625rem] leading-snug text-stone sm:text-[0.6875rem]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-line bg-paper p-2.5 sm:p-3">
          <p className="text-[0.625rem] font-semibold tracking-wide text-gold uppercase">
            Needs follow-up
          </p>
          <ul className="mt-2 space-y-1.5">
            {queue.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-2 text-[0.6875rem] sm:text-xs"
              >
                <span className="font-medium text-ink">{row.name}</span>
                <span className="rounded-sm bg-lagoon/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide text-lagoon uppercase">
                  {row.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </StackBrowserChrome>
  );
}

function CampaignsStackMock() {
  const rows = [
    { subject: "Sunday clinic reminder", sent: "Mar 8" },
    { subject: "New board games night", sent: "Mar 5" },
    { subject: "Summer camp early access", sent: "Feb 28" },
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

        <div className="flex h-10 items-end gap-1 rounded-[8px] border border-line bg-paper px-2 py-1.5">
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

export function MarketingHeroProductStack({ className }: { className?: string }) {
  return (
    <div
      className={cn("marketing-product-lift relative mx-auto w-full max-w-[520px]", className)}
      aria-label="Cohestra product preview: dashboard, email campaigns, and reports"
    >
      <div className="relative flex flex-col">
        <div className="marketing-hero-stack-card relative z-[1] w-[92%] -mb-24 sm:-mb-28">
          <div className="relative">
            <ReportsStackMock />
            <StackLabel
              icon={BarChart3}
              label="Reports"
              className="absolute -right-1 top-3 sm:-right-2 sm:top-4"
            />
          </div>
        </div>

        <div className="marketing-hero-stack-card relative z-[2] ml-auto w-[92%] -mb-24 sm:-mb-28">
          <div className="relative">
            <CampaignsStackMock />
            <StackLabel
              icon={Mail}
              label="Campaigns"
              className="absolute -left-1 top-3 sm:-left-2 sm:top-4"
            />
          </div>
        </div>

        <div className="marketing-hero-stack-card relative z-[3] ml-6 w-[calc(100%-1.5rem)] sm:ml-10 sm:w-[calc(100%-2.5rem)]">
          <div className="relative">
            <DashboardStackMock />
            <StackLabel
              icon={LayoutDashboard}
              label="Dashboard"
              className="absolute -right-1 -bottom-3 sm:-right-2 sm:-bottom-4"
            />
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-[34ch] text-center text-sm leading-relaxed text-stone">
        Dashboard, campaigns, and reports in one workspace — no spreadsheets or patchwork tools.
      </p>
    </div>
  );
}
