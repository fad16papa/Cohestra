"use client";

import { useEffect, useState } from "react";

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
};

export function ActivityOverviewSchedule({
  activity,
  onActivityUpdated,
  onDirtyChange,
}: ActivityOverviewScheduleProps) {
  const { authFetch } = useAuth();
  const isDraft = activity.status === "draft";
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
      setSavedMessage("Schedule saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save schedule."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isDraft) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Schedule
        </p>
        <p className="text-sm text-text-warm">{activity.schedule}</p>
        <p className="text-xs text-text-muted-warm">
          Published — unpublish from Overview to change the schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-warm bg-card p-4">
      <div>
        <h3 className="text-section text-text-warm">Schedule</h3>
        <p className="mt-0.5 text-sm text-text-muted-warm">
          Set the event date and time before you publish. This locks once the activity is
          live.
        </p>
      </div>
      <ActivitySchedulePicker
        value={dateTimeLocal}
        onChange={setDateTimeLocal}
        disabled={isSaving}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSaving}
          onClick={() => void handleSaveSchedule()}
        >
          {isSaving ? "Saving…" : "Save schedule"}
        </Button>
        {savedMessage ? (
          <p role="status" className="text-sm text-text-muted-warm">
            {savedMessage}
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
