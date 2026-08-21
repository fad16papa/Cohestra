"use client";

import { useEffect, useState } from "react";

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
      setSavedMessage("Registration cap saved.");
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
    <section className="space-y-4 rounded-xl border border-border-warm bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold text-text-warm">Registration cap</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Optional limit on how many people can register for this activity. Leave blank
          for unlimited registrations on this activity (monthly plan usage still applies).
        </p>
        {planRegistrationLimit != null ? (
          <p className="mt-1 text-xs text-text-muted-warm">
            Your plan allows up to{" "}
            {formatPlanRegistrationLimit(planRegistrationLimit)} registrations per month
            across all activities.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
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
        {activity.maxRegistrants != null ? (
          <p className="text-xs text-text-muted-warm">
            {activity.registrationCount} / {activity.maxRegistrants} registered
            {activity.registrationCount >= activity.maxRegistrants
              ? " — cap reached"
              : ""}
          </p>
        ) : (
          <p className="text-xs text-text-muted-warm">
            {activity.registrationCount} registered · no cap set
          </p>
        )}
      </div>

      {mustWaitForShell ? (
        <p className="text-sm text-text-muted-warm">Loading plan limits…</p>
      ) : null}
      {shellLimitsUnavailable ? (
        <p className="text-sm text-destructive">
          Plan limits could not be loaded. Refresh the page before setting a registration cap.
        </p>
      ) : null}
      {validationError && !error ? (
        <p className="text-sm text-destructive">{validationError}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {savedMessage ? (
        <p className="text-sm text-primary">{savedMessage}</p>
      ) : null}

      <Button
        type="button"
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
    </section>
  );
}
