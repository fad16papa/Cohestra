"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

import {
  ArchiveActivityDialog,
  type ArchiveActivityDialogVariant,
} from "@/components/activities/archive-activity-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  archiveActivity,
  publishActivity,
  unpublishActivity,
  type Activity,
} from "@/lib/activities-api";
import { isActivityScheduleUpcomingOrToday } from "@/lib/activity-schedule-utils";
import { getPublishGateIssues, publishGateSavedFormNote } from "@/lib/form-schema-utils";

type ActivityPublishControlsProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

export function ActivityPublishControls({
  activity,
  onActivityUpdated,
}: ActivityPublishControlsProps) {
  const { authFetch } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveDialogVariant, setArchiveDialogVariant] =
    useState<ArchiveActivityDialogVariant>("upcoming");

  const isBusy = isPublishing || isUnpublishing || isArchiving;
  const publishGateIssues = getPublishGateIssues(activity.formSchema);
  const publishBlocked = publishGateIssues.length > 0;

  async function performArchive() {
    setError(null);
    setSuccess(null);
    setIsArchiving(true);

    try {
      const updated = await archiveActivity(authFetch, activity.id);
      onActivityUpdated(updated);
      setArchiveDialogOpen(false);
      setSuccess("Activity archived. The public registration page is unavailable.");
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Could not archive activity."
      );
    } finally {
      setIsArchiving(false);
    }
  }

  function requestArchive() {
    if (activity.status === "draft") {
      void performArchive();
      return;
    }

    if (activity.status !== "published") {
      return;
    }

    setArchiveDialogVariant(
      isActivityScheduleUpcomingOrToday(activity.schedule) ? "upcoming" : "past"
    );
    setArchiveDialogOpen(true);
  }

  async function handlePublish() {
    setError(null);
    setSuccess(null);
    setIsPublishing(true);

    try {
      const updated = await publishActivity(authFetch, activity.id);
      onActivityUpdated(updated);
      setSuccess("Activity published. Registration link is live.");
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Could not publish activity."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function performUnpublish() {
    setError(null);
    setSuccess(null);
    setIsUnpublishing(true);

    try {
      const updated = await unpublishActivity(authFetch, activity.id);
      onActivityUpdated(updated);
      setUnpublishDialogOpen(false);
      setSuccess(
        "Activity unpublished. The registration link is offline until you publish again."
      );
    } catch (unpublishError) {
      setError(
        unpublishError instanceof Error
          ? unpublishError.message
          : "Could not unpublish activity."
      );
    } finally {
      setIsUnpublishing(false);
    }
  }

  if (activity.status === "archived") {
    return (
      <p
        role="status"
        className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm"
      >
        This activity is archived. Restore publishing in a future story if needed.
        The public registration URL shows an unavailable state.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
        <div>
          <h3 className="text-section text-text-warm">Publishing</h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Control when the public registration link is live.
          </p>
        </div>

        {activity.status === "draft" ? (
          <p className="text-sm text-text-muted-warm">{publishGateSavedFormNote}</p>
        ) : null}

        {activity.status === "published" ? (
          <p
            role="status"
            className="rounded-lg border border-border-warm bg-muted/30 px-4 py-3 text-sm text-text-warm"
          >
            Live at{" "}
            <code className="rounded bg-muted px-1 py-0.5">/register/{activity.slug}</code>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {activity.status === "draft" ? (
            <Button
              type="button"
              disabled={isBusy || publishBlocked}
              onClick={() => void handlePublish()}
            >
              {isPublishing ? "Publishing…" : "Publish activity"}
            </Button>
          ) : null}

          {activity.status === "published" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setUnpublishDialogOpen(true)}
              >
                {isUnpublishing ? "Unpublishing…" : "Unpublish activity"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={requestArchive}
              >
                {isArchiving ? "Archiving…" : "Archive activity"}
              </Button>
            </>
          ) : null}

          {activity.status === "draft" ? (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={requestArchive}
            >
              {isArchiving ? "Archiving…" : "Archive without publishing"}
            </Button>
          ) : null}
        </div>

        {activity.status === "draft" && publishBlocked ? (
          <div role="alert" className="space-y-1 text-sm text-destructive">
            {publishGateIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p role="status" className="text-sm text-text-warm">
            {success}
          </p>
        ) : null}
      </div>

      <ArchiveActivityDialog
        open={archiveDialogOpen}
        variant={archiveDialogVariant}
        activityName={activity.name}
        activitySchedule={activity.schedule}
        registrationPath={`/register/${activity.slug}`}
        isArchiving={isArchiving}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={() => void performArchive()}
      />

      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-muted-warm">
                <EyeOff className="size-4" aria-hidden />
              </span>
              <div className="space-y-2">
                <AlertDialogTitle>Unpublish this activity?</AlertDialogTitle>
                <AlertDialogDescription>
                  The public registration link at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    /register/{activity.slug}
                  </code>{" "}
                  will show as unavailable until you publish again. Existing registrations
                  are kept.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnpublishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUnpublishing}
              onClick={() => void performUnpublish()}
            >
              {isUnpublishing ? "Unpublishing…" : "Unpublish activity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
