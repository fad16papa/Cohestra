"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

import {
  ArchiveActivityDialog,
  type ArchiveActivityDialogVariant,
} from "@/components/activities/archive-activity-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PlanLimitAlert } from "@/components/shell/plan-limit-alert";
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
import { getPublishGateIssues } from "@/lib/form-schema-utils";
import { getPublishedActivitiesLimitMessage } from "@/lib/plan-limit-utils";

type ActivityPublishControlsProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
  unsavedTabs?: {
    form?: boolean;
    design?: boolean;
  };
};

export function ActivityPublishControls({
  activity,
  onActivityUpdated,
  unsavedTabs,
}: ActivityPublishControlsProps) {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [error, setError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveDialogVariant, setArchiveDialogVariant] =
    useState<ArchiveActivityDialogVariant>("upcoming");

  const isBusy = isPublishing || isUnpublishing || isArchiving;
  const publishGateIssues = getPublishGateIssues(activity.formSchema, {
    slug: activity.slug,
  });
  const unsavedPublishIssues = [
    unsavedTabs?.form ? "Save your form on the Form tab before publishing." : null,
    unsavedTabs?.design ? "Save your design on the Design tab before publishing." : null,
  ].filter((issue): issue is string => issue !== null);
  const publishedLimitMessage = getPublishedActivitiesLimitMessage(shell);
  const publishBlocked = publishGateIssues.length > 0 || unsavedPublishIssues.length > 0;
  const publishPlanBlocked = Boolean(publishedLimitMessage);

  async function performArchive() {
    setError(null);
    setArchiveError(null);
    setSuccess(null);
    setIsArchiving(true);

    try {
      const updated = await archiveActivity(authFetch, activity.id);
      onActivityUpdated(updated);
      setArchiveDialogOpen(false);
      await refreshShell();
      setSuccess("Activity archived.");
    } catch (archiveError) {
      const message =
        archiveError instanceof Error
          ? archiveError.message
          : "Could not archive activity.";
      setArchiveError(message);
      setError(message);
    } finally {
      setIsArchiving(false);
    }
  }

  function requestArchive() {
    setArchiveError(null);
    setError(null);
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
      setSuccess("Activity is live.");
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
      await refreshShell();
      setSuccess("Activity is offline until you publish again.");
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
        className="text-sm text-text-muted-warm"
      >
        This activity is archived. The public registration page is unavailable.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-section text-text-warm">Publishing</h3>
            {activity.status === "published" ? (
              <p className="mt-0.5 text-sm text-text-muted-warm">
                Live at{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  /register/{activity.slug}
                </code>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-text-muted-warm">
                Publish to open registration and unlock Share kit.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {activity.status === "draft" ? (
              <Button
                type="button"
                disabled={isBusy || publishBlocked || publishPlanBlocked}
                onClick={() => void handlePublish()}
              >
                {isPublishing ? "Publishing…" : "Publish"}
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
                  {isUnpublishing ? "Unpublishing…" : "Unpublish"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={requestArchive}
                >
                  {isArchiving ? "Archiving…" : "Archive"}
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
                {isArchiving ? "Archiving…" : "Archive"}
              </Button>
            ) : null}
          </div>
        </div>

        {activity.status === "draft" && publishPlanBlocked ? (
          <PlanLimitAlert message={publishedLimitMessage ?? undefined} />
        ) : null}

        {activity.status === "draft" && publishBlocked ? (
          <ul role="alert" className="list-disc space-y-0.5 pl-5 text-sm text-destructive">
            {unsavedPublishIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
            {publishGateIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p role="status" className="text-sm text-text-muted-warm">
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
        error={archiveError}
        onOpenChange={(open) => {
          setArchiveDialogOpen(open);
          if (!open) {
            setArchiveError(null);
          }
        }}
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
