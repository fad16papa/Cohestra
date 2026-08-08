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
  onLeadStatusChange: (status: LeadStatus | null) => void;
  onMergeSuspectToggle: (active: boolean) => void;
  onRegisteredWithinDaysChange: (days: number | null) => void;
};

function FilterChip({ chip }: { chip: LeadQueueFilterChip }) {
  return (
    <button
      type="button"
      aria-pressed={chip.active}
      onClick={chip.onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        chip.active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-warm bg-background text-text-muted-warm hover:border-primary/30 hover:text-text-warm"
      )}
    >
      <span>{chip.label}</span>
      {typeof chip.count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
            chip.active ? "bg-primary/15" : "bg-muted/70"
          )}
        >
          {chip.count}
        </span>
      ) : null}
    </button>
  );
}

export function ClientLeadQueueHeader({
  statusCounts,
  activeLeadStatus,
  mergeSuspectOnly,
  registeredWithinDays,
  onLeadStatusChange,
  onMergeSuspectToggle,
  onRegisteredWithinDaysChange,
}: ClientLeadQueueHeaderProps) {
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
    active: activeLeadStatus === status && !mergeSuspectOnly,
    onClick: () => {
      if (activeLeadStatus === status && !mergeSuspectOnly) {
        onLeadStatusChange(null);
        return;
      }

      onLeadStatusChange(status);
    },
  }));

  const quickFilterChips: LeadQueueFilterChip[] = [
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => (
          <FilterChip key={chip.id} chip={chip} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {quickFilterChips.map((chip) => (
          <FilterChip key={chip.id} chip={chip} />
        ))}
      </div>
    </div>
  );
}
