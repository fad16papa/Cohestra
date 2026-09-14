"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

import { ActivitySchedulePicker } from "@/components/activities/activity-schedule-picker";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  buildScheduleUpdatePayload,
  activityScheduleToDateTimeLocal,
  isSameScheduleDateTimeLocal,
} from "@/lib/activity-schedule-edit";
import { updateActivity, type Activity } from "@/lib/activities-api";

type ActivityOverviewScheduleProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** When true, render inside the Overview facts grid (Schedule column). */
  variant?: "card" | "facts";
};

function isDraftActivity(activity: Activity): boolean {
  return activity.status.toLowerCase() === "draft";
}

export function ActivityOverviewSchedule({
  activity,
  onActivityUpdated,
  onDirtyChange,
  variant = "facts",
}: ActivityOverviewScheduleProps) {
  const { authFetch } = useAuth();
  const isDraft = isDraftActivity(activity);
  const [dateTimeLocal, setDateTimeLocal] = useState(() =>
    activityScheduleToDateTimeLocal(activity)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDateTimeLocal(activityScheduleToDateTimeLocal(activity));
  }, [activity.id, activity.schedule, activity.scheduledStartsAt]);

  const isDirty = isDraft && !isSameScheduleDateTimeLocal(activity, dateTimeLocal);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function handleSaveSchedule() {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    const { schedule, scheduledStartsAt } = buildScheduleUpdatePayload(dateTimeLocal);

    try {
      const updated = await updateActivity(authFetch, activity.id, {
        name: activity.name,
        category: activity.category,
        schedule,
        scheduledStartsAt,
        location: activity.location,
        communityLabel: activity.communityLabel,
        heroImageUrl: activity.heroImageUrl,
        accentColor: activity.accentColor,
        maxRegistrants: activity.maxRegistrants,
      });
      onActivityUpdated(updated);
      setSavedMessage("Saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save schedule."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isDraft) {
    const readonly = (
      <>
        <p className="text-sm text-text-warm">{activity.schedule}</p>
        <p className="text-xs text-text-muted-warm">
          Unpublish from Overview to change the schedule.
        </p>
      </>
    );

    if (variant === "facts") {
      return readonly;
    }

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Schedule
        </p>
        {readonly}
      </div>
    );
  }

  const editor = (
    <div className="space-y-2">
      <ActivitySchedulePicker
        inputId="activity-overview-schedule"
        value={dateTimeLocal}
        onChange={setDateTimeLocal}
        disabled={isSaving}
        requireFutureDate={false}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!isDirty || isSaving}
          onClick={() => void handleSaveSchedule()}
        >
          {isSaving ? "Saving…" : "Save schedule"}
        </Button>
        {savedMessage ? (
          <span role="status" className="text-xs text-text-muted-warm">
            {savedMessage}
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-text-muted-warm">
        Locks after publish. Check date and time before you go live.
      </p>
    </div>
  );

  if (variant === "facts") {
    return editor;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-warm bg-card p-4">
      <div>
        <h3 className="text-section text-text-warm">Schedule</h3>
        <p className="mt-0.5 text-sm text-text-muted-warm">
          Set the event date and time before you publish.
        </p>
      </div>
      {editor}
    </div>
  );
}

export function ActivityOverviewScheduleFactsLabel() {
  return (
    <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
      <Calendar className="size-3.5" aria-hidden />
      Schedule
    </dt>
  );
}
