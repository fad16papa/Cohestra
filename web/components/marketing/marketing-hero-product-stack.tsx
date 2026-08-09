"use client";

import type { ReactNode } from "react";
import { BarChart3, LayoutDashboard, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

const LADDER_STEPS = [
  { top: "top-0", left: "left-0", width: "w-[88%]" },
  { top: "top-[8rem] sm:top-[8.5rem]", left: "left-[4%] sm:left-[5%]", width: "w-[88%]" },
  { top: "top-[16rem] sm:top-[17rem]", left: "left-[8%] sm:left-[10%]", width: "w-[88%]" },
] as const;

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

type LadderCardProps = {
  children: ReactNode;
  label: string;
  icon: typeof LayoutDashboard;
  step: 0 | 1 | 2;
  labelClassName: string;
};

function LadderCard({ children, label, icon, step, labelClassName }: LadderCardProps) {
  const position = LADDER_STEPS[step];

  return (
    <div
      className={cn(
        "marketing-hero-stack-card absolute",
        position.top,
        position.left,
        position.width
      )}
      style={{ zIndex: step + 1 }}
    >
      <div className="relative">
        {children}
        <StackLabel icon={icon} label={label} className={labelClassName} />
      </div>
    </div>
  );
}

export function MarketingHeroProductStack({ className }: { className?: string }) {
  return (
    <div
      className={cn("marketing-product-lift relative mx-auto w-full max-w-[560px]", className)}
      aria-label="Cohestra product preview: dashboard, email campaigns, and reports"
    >
      <div className="relative h-[27rem] sm:h-[29rem]">
        <LadderCard
          step={0}
          label="Reports"
          icon={BarChart3}
          labelClassName="absolute -right-1 top-3 sm:-right-2 sm:top-4"
        >
          <ReportsStackMock />
        </LadderCard>

        <LadderCard
          step={1}
          label="Campaigns"
          icon={Mail}
          labelClassName="absolute -left-1 top-3 sm:-left-2 sm:top-4"
        >
          <CampaignsStackMock />
        </LadderCard>

        <LadderCard
          step={2}
          label="Dashboard"
          icon={LayoutDashboard}
          labelClassName="absolute -right-1 -bottom-3 sm:-right-2 sm:-bottom-4"
        >
          <DashboardStackMock />
        </LadderCard>
      </div>

      <p className="mx-auto mt-4 max-w-[34ch] text-center text-sm leading-relaxed text-stone">
        Dashboard, campaigns, and reports in one workspace — no spreadsheets or patchwork tools.
      </p>
    </div>
  );
}
