"use client";

import { Button } from "@/components/ui/button";
import { leadStatusLabels, type LeadStatus } from "@/lib/clients-api";

type FilterBannerConfig = {
  id: string;
  message: string;
  clearLabel: string;
  onClear: () => void;
};

type ClientsFilterBannersProps = {
  followUpDue: boolean;
  mergeSuspect: boolean;
  registeredWithinDays: number | null;
  createdWithinDays: number | null;
  leadStatus: LeadStatus | null;
  nationality: string;
  activityId: string;
  activityLabel: string;
  onClearFollowUpDue: () => void;
  onClearMergeSuspect: () => void;
  onClearRegisteredWithinDays: () => void;
  onClearCreatedWithinDays: () => void;
  onClearLeadStatus: () => void;
  onClearNationality: () => void;
  onClearActivity: () => void;
};

function dayCountLabel(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function buildFilterBanners(props: ClientsFilterBannersProps): FilterBannerConfig[] {
  const banners: FilterBannerConfig[] = [];

  if (props.followUpDue) {
    banners.push({
      id: "follow-up-due",
      message: "Showing clients with a follow-up due today or overdue.",
      clearLabel: "Clear filter",
      onClear: props.onClearFollowUpDue,
    });
  }

  if (props.mergeSuspect) {
    banners.push({
      id: "merge-suspect",
      message: "Showing merge-suspect clients only.",
      clearLabel: "Clear filter",
      onClear: props.onClearMergeSuspect,
    });
  }

  if (props.registeredWithinDays) {
    banners.push({
      id: "registered-within-days",
      message: `Showing clients with a registration in the last ${dayCountLabel(props.registeredWithinDays)}.`,
      clearLabel: "Clear filter",
      onClear: props.onClearRegisteredWithinDays,
    });
  }

  if (props.createdWithinDays && !props.registeredWithinDays) {
    banners.push({
      id: "created-within-days",
      message: `Showing clients created in the last ${dayCountLabel(props.createdWithinDays)}.`,
      clearLabel: "Clear filter",
      onClear: props.onClearCreatedWithinDays,
    });
  }

  if (
    props.leadStatus &&
    !props.mergeSuspect &&
    !props.createdWithinDays &&
    !props.registeredWithinDays
  ) {
    banners.push({
      id: "lead-status",
      message: `Showing clients with status ${leadStatusLabels[props.leadStatus]}.`,
      clearLabel: "Clear status filter",
      onClear: props.onClearLeadStatus,
    });
  }

  if (
    props.nationality &&
    !props.mergeSuspect &&
    !props.createdWithinDays &&
    !props.registeredWithinDays
  ) {
    banners.push({
      id: "nationality",
      message: `Showing clients with nationality ${props.nationality}.`,
      clearLabel: "Clear nationality filter",
      onClear: props.onClearNationality,
    });
  }

  if (props.activityId) {
    banners.push({
      id: "activity",
      message: `Filtered by activity${props.activityLabel ? `: ${props.activityLabel}` : ""}.`,
      clearLabel: "Clear filter",
      onClear: props.onClearActivity,
    });
  }

  return banners;
}

export function ClientsFilterBanners(props: ClientsFilterBannersProps) {
  const banners = buildFilterBanners(props);

  if (banners.length === 0) {
    return null;
  }

  return (
    <>
      {banners.map((banner) => (
        <div
          key={banner.id}
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{banner.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={banner.onClear}>
            {banner.clearLabel}
          </Button>
        </div>
      ))}
    </>
  );
}
