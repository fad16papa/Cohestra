"use client";

import type { ReactNode } from "react";
import { MessageCircle, Search, Users } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { marketingCardSurfaceClass } from "@/components/marketing/marketing-shell";
import type { LeadStatus } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ShowcaseClient = {
  id: string;
  name: string;
  nationality: string;
  status: LeadStatus;
  lastActivity: string;
  selected?: boolean;
};

const SHOWCASE_CLIENTS: ShowcaseClient[] = [
  {
    id: "1",
    name: "Elena Martinez",
    nationality: "Spain",
    status: "active",
    lastActivity: "Registered Sunday clinic · 2 days ago",
    selected: true,
  },
  {
    id: "2",
    name: "Sam Rivera",
    nationality: "USA",
    status: "new",
    lastActivity: "Registered board games night · today",
  },
  {
    id: "3",
    name: "Jordan Kim",
    nationality: "South Korea",
    status: "contacted",
    lastActivity: "WhatsApp follow up · yesterday",
  },
  {
    id: "4",
    name: "Priya Shah",
    nationality: "India",
    status: "active",
    lastActivity: "Registered youth open play · 4 days ago",
  },
  {
    id: "5",
    name: "Marcus Chen",
    nationality: "Singapore",
    status: "inactive",
    lastActivity: "Registered summer camp · 3 weeks ago",
  },
];

const TIMELINE = [
  { label: "Registered Sunday clinic", meta: "Mar 8 · Registration #142", tone: "default" as const },
  { label: "WhatsApp message logged", meta: "Mar 9 · Welcome note sent", tone: "lagoon" as const },
  { label: "Status changed to Active", meta: "Mar 10 · After second visit", tone: "default" as const },
  { label: "Registered board games night", meta: "Mar 15 · Registration #158", tone: "default" as const },
];

function ShowcaseBrowserChrome({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-y border-line bg-paper sm:rounded-[20px] sm:border"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-paper-warm px-4 py-3 sm:px-5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate font-mono text-[0.7rem] text-stone sm:ml-3 sm:text-xs">
          default.localhost/clients
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function ShowcaseClientsList({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col border-b border-line bg-paper",
        compact ? "lg:w-[55%] lg:border-r lg:border-b-0" : "lg:w-[52%] lg:border-r lg:border-b-0"
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-line px-4 py-4 sm:px-6",
          compact ? "sm:py-4" : "sm:py-5"
        )}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Users className="size-5 text-lagoon" aria-hidden />
          <p className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-ink sm:text-[1.35rem]">
            Clients
          </p>
          <span className="rounded-full bg-lagoon/10 px-2.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-lagoon uppercase">
            248
          </span>
        </div>
        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone"
            aria-hidden
          />
          <div className="h-11 rounded-[10px] border border-line bg-paper-warm pl-11 text-sm leading-[2.75rem] text-stone sm:h-12 sm:pl-12 sm:text-[0.9375rem]">
            Search by name or nationality
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "New", "Contacted", "Active"].map((filter, index) => (
            <span
              key={filter}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium sm:text-[0.8125rem]",
                index === 0
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-stone"
              )}
            >
              {filter}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden shrink-0 border-b border-line px-4 py-2.5 text-[0.6875rem] font-semibold tracking-wide text-stone uppercase md:grid md:grid-cols-[1.25fr_0.75fr_0.75fr_1.1fr] md:gap-4 md:px-6">
        <span>Name</span>
        <span className="text-center">Nationality</span>
        <span>Status</span>
        <span>Last activity</span>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {SHOWCASE_CLIENTS.slice(0, compact ? 4 : SHOWCASE_CLIENTS.length).map((client) => (
          <div
            key={client.id}
            className={cn(
              "px-4 py-4 sm:px-6 sm:py-4",
              client.selected && "border-l-4 border-l-lagoon bg-lagoon/[0.05]"
            )}
          >
            <div className="flex items-start gap-3 md:hidden">
              <PersonAvatar name={client.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-ink">{client.name}</p>
                  <LeadStatusBadge status={client.status} />
                </div>
                <p className="mt-1 text-sm text-stone">{client.nationality}</p>
                <p className="mt-1 text-sm leading-snug text-stone">{client.lastActivity}</p>
              </div>
            </div>

            <div className="hidden md:grid md:grid-cols-[1.25fr_0.75fr_0.75fr_1.1fr] md:items-center md:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={client.name} size="sm" />
                <span className="truncate text-[0.9375rem] font-semibold text-ink">
                  {client.name}
                </span>
              </div>
              <span className="truncate text-center text-sm text-stone">{client.nationality}</span>
              <LeadStatusBadge status={client.status} />
              <span className="truncate text-sm text-stone">{client.lastActivity}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseClientProfile({ compact = false }: { compact?: boolean }) {
  const selected = SHOWCASE_CLIENTS.find((client) => client.selected)!;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-paper-warm/50 p-4 sm:p-6 lg:overflow-y-auto",
        compact && "p-4 sm:p-5"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <PersonAvatar name={selected.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-[-0.02em] text-ink sm:text-[1.35rem]">
            {selected.name}
          </p>
          <p className="mt-0.5 text-sm text-stone sm:text-[0.9375rem]">{selected.nationality}</p>
        </div>
        <LeadStatusBadge status={selected.status} />
      </div>

      <div className={marketingCardSurfaceClass("mt-5 p-4 sm:p-5")}>
        <p className="text-[0.6875rem] font-semibold tracking-wide text-stone uppercase">
          Contact
        </p>
        <p className="mt-2 text-base text-ink sm:text-[1.02rem]">elena@example.com</p>
        <p className="mt-1 text-base text-stone sm:text-[1.02rem]">+34 612 345 678</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-lagoon/25 bg-lagoon/10 text-sm font-semibold text-lagoon">
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </span>
        <span className="inline-flex h-11 items-center justify-center rounded-[10px] border border-line bg-paper text-sm font-semibold text-ink">
          Viber
        </span>
      </div>

      <div className={marketingCardSurfaceClass("mt-5 flex-1 p-4 sm:p-5")}>
        <p className="text-[0.6875rem] font-semibold tracking-wide text-stone uppercase">
          Relationship timeline
        </p>
        <ul className="mt-4 space-y-4">
          {TIMELINE.slice(0, compact ? 3 : TIMELINE.length).map((event) => (
            <li key={event.label} className="flex gap-3">
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  event.tone === "lagoon" ? "bg-lagoon" : "bg-line-strong"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink sm:text-[0.9375rem]">{event.label}</p>
                <p className="mt-0.5 text-sm text-stone">{event.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MarketingCrmShowcase({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col", className)}>
      <div className="marketing-crm-showcase-frame w-full min-w-0">
        <div
          className={cn(
            "marketing-crm-showcase-surface shadow-[0_32px_64px_rgba(7,13,18,0.12)]",
            compact
              ? "min-h-[420px] sm:min-h-[480px] lg:min-h-[520px]"
              : "min-h-[min(78vh,920px)] sm:min-h-[min(82vh,960px)]"
          )}
        >
          <ShowcaseBrowserChrome>
            <div
              className={cn(
                "flex h-full flex-col",
                compact ? "min-h-[380px] lg:min-h-[480px] lg:flex-row" : "min-h-[min(72vh,840px)] lg:min-h-0 lg:flex-row"
              )}
            >
              <ShowcaseClientsList compact={compact} />
              <ShowcaseClientProfile compact={compact} />
            </div>
          </ShowcaseBrowserChrome>
        </div>
      </div>

      {!compact ? (
        <p className="mx-auto mt-6 max-w-2xl px-5 text-center text-sm text-stone sm:px-8 sm:text-[0.9375rem]">
          One profile per person. List, profile, and timeline stay in the same workspace.
        </p>
      ) : null}
    </div>
  );
}
