"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateActivity, type Activity } from "@/lib/activities-api";
import {
  formatPlanRegistrationLimit,
  parseActivityMaxRegistrantsInput,
  resolvePlanRegistrationLimit,
  validateActivityMaxRegistrantsAgainstPlan,
} from "@/lib/activity-capacity-limits";

type ActivityCapacityPanelProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

function parseMaxRegistrantsInput(value: string): number | null {
  return parseActivityMaxRegistrantsInput(value);
}

export function ActivityCapacityPanel({
  activity,
  onActivityUpdated,
}: ActivityCapacityPanelProps) {
  const { authFetch } = useAuth();
  const { shell, loading: shellLoading, error: shellError } = useTenantShell();
  const planRegistrationLimit = resolvePlanRegistrationLimit(shell);
  const [maxRegistrants, setMaxRegistrants] = useState(
    activity.maxRegistrants != null ? String(activity.maxRegistrants) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setMaxRegistrants(
      activity.maxRegistrants != null ? String(activity.maxRegistrants) : ""
    );
  }, [activity.id, activity.maxRegistrants]);

  const isArchived = activity.status === "archived";
  const parsedCap = parseMaxRegistrantsInput(maxRegistrants);
  const savedCap = activity.maxRegistrants ?? null;
  const isDirty = parsedCap !== savedCap;
  const formatError =
    maxRegistrants.trim() && (parsedCap === null || parsedCap < 1)
      ? "Enter a whole number of at least 1, or leave blank for unlimited."
      : null;
  const planCapError =
    planRegistrationLimit != null
      ? validateActivityMaxRegistrantsAgainstPlan(parsedCap, planRegistrationLimit)
      : null;
  const validationError = formatError ?? planCapError;
  const mustWaitForShell =
    Boolean(maxRegistrants.trim()) && shellLoading && planRegistrationLimit == null;
  const shellLimitsUnavailable =
    Boolean(maxRegistrants.trim()) &&
    !shellLoading &&
    planRegistrationLimit == null &&
    shellError != null;

  const registrationSummary =
    activity.maxRegistrants != null
      ? `${activity.registrationCount} / ${activity.maxRegistrants} registered${
          activity.registrationCount >= activity.maxRegistrants ? " · cap reached" : ""
        }`
      : `${activity.registrationCount} registered · no cap on this activity`;

  async function handleSave() {
    if (isArchived || !isDirty || isSaving || mustWaitForShell || shellLimitsUnavailable) {
      return;
    }

    if (formatError) {
      setError(formatError);
      return;
    }

    if (planCapError) {
      setError(planCapError);
      return;
    }

    if (shellLimitsUnavailable) {
      setError("Plan limits could not be loaded. Refresh the page and try again.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const updated = await updateActivity(authFetch, activity.id, {
        name: activity.name,
        category: activity.category,
        schedule: activity.schedule,
        scheduledStartsAt: activity.scheduledStartsAt,
        location: activity.location,
        communityLabel: activity.communityLabel,
        heroImageUrl: activity.heroImageUrl,
        accentColor: activity.accentColor,
        maxRegistrants: parsedCap,
      });
      onActivityUpdated(updated);
      setSavedMessage("Saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save registration cap."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="activity-capacity-heading"
      className="rounded-xl border border-border-warm bg-card p-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="activity-capacity-heading"
            className="flex items-center gap-2 text-sm font-semibold text-text-warm"
          >
            <Users className="size-4 text-text-muted-warm" aria-hidden />
            Registration cap
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-muted-warm">
            Optional limit for this activity. Leave blank for unlimited sign-ups here
            (monthly plan usage still applies).
            {planRegistrationLimit != null ? (
              <>
                {" "}
                Plan ceiling:{" "}
                {formatPlanRegistrationLimit(planRegistrationLimit)}/month tenant-wide.
              </>
            ) : null}
          </p>
        </div>
        <p className="text-sm font-medium text-text-warm sm:text-right">
          {registrationSummary}
          {" · "}
          <Link
            href={`/activities/${activity.id}?tab=registrations`}
            className="font-normal text-primary underline-offset-2 hover:underline"
          >
            View list
          </Link>
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
          <Label htmlFor="activity-max-registrants">Max registrants (optional)</Label>
          <Input
            id="activity-max-registrants"
            type="number"
            min={1}
            max={planRegistrationLimit ?? undefined}
            inputMode="numeric"
            placeholder="Unlimited"
            value={maxRegistrants}
            disabled={isArchived}
            onChange={(event) => {
              setMaxRegistrants(event.target.value);
              setSavedMessage(null);
              setError(null);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={
              isArchived ||
              !isDirty ||
              isSaving ||
              mustWaitForShell ||
              shellLimitsUnavailable ||
              Boolean(formatError) ||
              Boolean(planCapError)
            }
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save cap"}
          </Button>
          {savedMessage ? (
            <span role="status" className="text-xs text-text-muted-warm">
              {savedMessage}
            </span>
          ) : null}
        </div>
      </div>

      {mustWaitForShell ? (
        <p className="mt-2 text-sm text-text-muted-warm">Loading plan limits…</p>
      ) : null}
      {shellLimitsUnavailable ? (
        <p className="mt-2 text-sm text-destructive">
          Plan limits could not be loaded. Refresh the page before setting a cap.
        </p>
      ) : null}
      {validationError && !error ? (
        <p className="mt-2 text-sm text-destructive">{validationError}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
