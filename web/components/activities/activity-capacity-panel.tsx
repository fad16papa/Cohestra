"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateActivity, type Activity } from "@/lib/activities-api";

type ActivityCapacityPanelProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

function parseMaxRegistrantsInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ActivityCapacityPanel({
  activity,
  onActivityUpdated,
}: ActivityCapacityPanelProps) {
  const { authFetch } = useAuth();
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

  async function handleSave() {
    if (isArchived || !isDirty || isSaving) {
      return;
    }

    if (maxRegistrants.trim() && (parsedCap === null || parsedCap < 1)) {
      setError("Enter a whole number of at least 1, or leave blank for unlimited.");
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
          Optional limit on how many people can register. Leave blank for unlimited
          registrations.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-max-registrants">Max registrants (optional)</Label>
        <Input
          id="activity-max-registrants"
          type="number"
          min={1}
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {savedMessage ? (
        <p className="text-sm text-primary">{savedMessage}</p>
      ) : null}

      <Button
        type="button"
        disabled={isArchived || !isDirty || isSaving}
        onClick={() => void handleSave()}
      >
        {isSaving ? "Saving…" : "Save cap"}
      </Button>
    </section>
  );
}
