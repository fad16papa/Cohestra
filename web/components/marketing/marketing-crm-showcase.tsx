"use client";

import type { ReactNode } from "react";
import { MessageCircle, Search, Users } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { PersonAvatar } from "@/components/shared/person-avatar";
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
];

const TIMELINE = [
  { label: "Registered Sunday clinic", meta: "Mar 8 · #142", tone: "default" as const },
  { label: "WhatsApp message logged", meta: "Mar 9 · Welcome note sent", tone: "lagoon" as const },
  { label: "Status changed to Active", meta: "Mar 10 · After second visit", tone: "default" as const },
];

function ShowcaseBrowserChrome({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-[20px] border border-line bg-paper shadow-[0_32px_64px_rgba(7,13,18,0.14)]"
    >
      <div className="flex items-center gap-2 border-b border-line bg-paper-warm px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[0.65rem] text-stone">
          default.localhost/clients
        </span>
      </div>
      {children}
    </div>
  );
}

function ShowcaseClientsList() {
  return (
    <div className="border-r border-line bg-paper lg:w-[58%]">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-lagoon" aria-hidden />
          <p className="font-[family-name:var(--font-fraunces)] text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
            Clients
          </p>
          <span className="rounded-full bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
            248
          </span>
        </div>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-stone"
            aria-hidden
          />
          <div className="h-9 rounded-[8px] border border-line bg-paper-warm pl-9 text-xs leading-9 text-stone">
            Search by name or nationality
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["All", "New", "Contacted", "Active"].map((filter, index) => (
            <span
              key={filter}
              className={cn(
                "rounded-full px-2.5 py-1 text-[0.6875rem] font-medium",
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

      <div className="hidden border-b border-line px-4 py-2 text-[0.625rem] font-semibold tracking-wide text-stone uppercase sm:grid sm:grid-cols-[1.2fr_0.7fr_0.7fr_1fr] sm:gap-3 sm:px-5">
        <span>Name</span>
        <span className="text-center">Nationality</span>
        <span>Status</span>
        <span>Last activity</span>
      </div>

      <div className="divide-y divide-line">
        {SHOWCASE_CLIENTS.map((client) => (
          <div
            key={client.id}
            className={cn(
              "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1.2fr_0.7fr_0.7fr_1fr] sm:items-center sm:gap-3 sm:px-5 sm:py-3.5",
              client.selected && "border-l-4 border-l-lagoon bg-lagoon/[0.04]"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar name={client.name} size="sm" />
              <span className="truncate text-sm font-semibold text-ink">{client.name}</span>
            </div>
            <span className="hidden truncate text-center text-xs text-stone sm:block">
              {client.nationality}
            </span>
            <LeadStatusBadge status={client.status} />
            <span className="hidden truncate text-xs text-stone sm:block">{client.lastActivity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseClientProfile() {
  const selected = SHOWCASE_CLIENTS.find((client) => client.selected)!;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-paper-warm/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <PersonAvatar name={selected.name} size="md" />
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-fraunces)] text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
            {selected.name}
          </p>
          <p className="text-xs text-stone">{selected.nationality}</p>
        </div>
        <LeadStatusBadge status={selected.status} className="ml-auto" />
      </div>

      <div className="mt-4 rounded-[12px] border border-line bg-paper p-3">
        <p className="text-[0.625rem] font-semibold tracking-wide text-stone uppercase">
          Contact
        </p>
        <p className="mt-1 text-sm text-ink">elena@example.com</p>
        <p className="text-sm text-stone">+34 612 345 678</p>
      </div>

      <div className="mt-3 flex gap-2">
        <span className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-lagoon/25 bg-lagoon/10 text-xs font-semibold text-lagoon">
          <MessageCircle className="size-3.5" aria-hidden />
          WhatsApp
        </span>
        <span className="inline-flex h-8 flex-1 items-center justify-center rounded-[8px] border border-line bg-paper text-xs font-semibold text-ink">
          Viber
        </span>
      </div>

      <div className="mt-4 min-h-0 flex-1 rounded-[12px] border border-line bg-paper p-3">
        <p className="text-[0.625rem] font-semibold tracking-wide text-stone uppercase">
          Relationship timeline
        </p>
        <ul className="mt-3 space-y-3">
          {TIMELINE.map((event) => (
            <li key={event.label} className="flex gap-2.5">
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  event.tone === "lagoon" ? "bg-lagoon" : "bg-line-strong"
                )}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">{event.label}</p>
                <p className="text-[0.6875rem] text-stone">{event.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MarketingCrmShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <ShowcaseBrowserChrome>
        <div className="flex min-h-[420px] flex-col lg:min-h-[460px] lg:flex-row">
          <ShowcaseClientsList />
          <ShowcaseClientProfile />
        </div>
      </ShowcaseBrowserChrome>

      <div className="absolute -bottom-4 left-5 z-[2] rounded-[14px] border border-line bg-paper px-4 py-3 shadow-[0_20px_44px_rgba(7,13,18,0.16)] max-sm:relative max-sm:mt-4 max-sm:w-fit">
        <p className="text-sm font-medium text-ink">One profile per person</p>
        <p className="mt-0.5 text-xs text-stone">List, profile, and timeline in one view</p>
      </div>
    </div>
  );
}
