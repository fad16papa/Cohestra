"use client";

import { cn } from "@/lib/utils";
import {
  leadStatusLabels,
  type ClientLeadStatusCounts,
  type LeadStatus,
} from "@/lib/clients-api";

type LeadQueueFilterChip = {
  id: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
};

type ClientLeadQueueHeaderProps = {
  statusCounts: ClientLeadStatusCounts;
  activeLeadStatus: LeadStatus | null;
  mergeSuspectOnly: boolean;
  registeredWithinDays: number | null;
  followUpDueOnly: boolean;
  onLeadStatusChange: (status: LeadStatus | null) => void;
  onMergeSuspectToggle: (active: boolean) => void;
  onRegisteredWithinDaysChange: (days: number | null) => void;
  onFollowUpDueToggle: (active: boolean) => void;
};

function FilterChip({ chip }: { chip: LeadQueueFilterChip }) {
  return (
    <button
      type="button"
      aria-pressed={chip.active}
      onClick={chip.onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        chip.active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-warm bg-background text-text-muted-warm hover:border-primary/30 hover:text-text-warm"
      )}
    >
      <span className="whitespace-nowrap">{chip.label}</span>
      {typeof chip.count === "number" ? (
        <span
          className={cn(
            "inline-flex min-w-[1.375rem] justify-center rounded-full px-1.5 py-0.5 text-xs tabular-nums leading-none",
            chip.active ? "bg-primary/15" : "bg-muted/70"
          )}
        >
          {chip.count}
        </span>
      ) : null}
    </button>
  );
}

function FilterGroupLabel({ children }: { children: string }) {
  return (
    <span className="shrink-0 text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted-warm">
      {children}
    </span>
  );
}

function FilterDivider() {
  return (
    <span
      className="mx-1 hidden h-5 w-px shrink-0 bg-border-warm sm:block"
      aria-hidden
    />
  );
}

export function ClientLeadQueueHeader({
  statusCounts,
  activeLeadStatus,
  mergeSuspectOnly,
  registeredWithinDays,
  followUpDueOnly,
  onLeadStatusChange,
  onMergeSuspectToggle,
  onRegisteredWithinDaysChange,
  onFollowUpDueToggle,
}: ClientLeadQueueHeaderProps) {
  const quickFilterActive =
    mergeSuspectOnly || followUpDueOnly || registeredWithinDays === 7;

  const statusChips: LeadQueueFilterChip[] = (
    ["new", "contacted", "active", "inactive"] as const
  ).map((status) => ({
    id: `status-${status}`,
    label: leadStatusLabels[status],
    count:
      status === "new"
        ? statusCounts.newCount
        : status === "contacted"
          ? statusCounts.contactedCount
          : status === "active"
            ? statusCounts.activeCount
            : statusCounts.inactiveCount,
    active: activeLeadStatus === status && !quickFilterActive,
    onClick: () => {
      if (activeLeadStatus === status && !quickFilterActive) {
        onLeadStatusChange(null);
        return;
      }

      onLeadStatusChange(status);
    },
  }));

  const quickFilterChips: LeadQueueFilterChip[] = [
    {
      id: "follow-up-due",
      label: "Follow-up due",
      count: statusCounts.followUpDueCount,
      active: followUpDueOnly,
      onClick: () => {
        onFollowUpDueToggle(!followUpDueOnly);
      },
    },
    {
      id: "registered-week",
      label: "Registered this week",
      active: registeredWithinDays === 7,
      onClick: () => {
        onRegisteredWithinDaysChange(registeredWithinDays === 7 ? null : 7);
      },
    },
    {
      id: "merge-suspects",
      label: "Merge suspects",
      count: statusCounts.mergeSuspectCount,
      active: mergeSuspectOnly,
      onClick: () => {
        onMergeSuspectToggle(!mergeSuspectOnly);
      },
    },
  ];

  return (
    <section
      aria-label="Lead queue filters"
      className="rounded-xl border border-border-warm bg-card px-3 py-2.5 sm:px-4 sm:py-3"
    >
      <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterGroupLabel>Status</FilterGroupLabel>
        {statusChips.map((chip) => (
          <FilterChip key={chip.id} chip={chip} />
        ))}

        <FilterDivider />

        <FilterGroupLabel>Quick</FilterGroupLabel>
        {quickFilterChips.map((chip) => (
          <FilterChip key={chip.id} chip={chip} />
        ))}
      </div>
    </section>
  );
}
