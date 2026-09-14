"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/activities-api";

type ActivityPublishConfirmDialogProps = {
  open: boolean;
  activity: Activity;
  isPublishing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ActivityPublishConfirmDialog({
  open,
  activity,
  isPublishing,
  onOpenChange,
  onConfirm,
}: ActivityPublishConfirmDialogProps) {
  const capLabel =
    activity.maxRegistrants != null
      ? `${activity.registrationCount} / ${activity.maxRegistrants}`
      : `${activity.registrationCount} (no cap)`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-muted-warm">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
            <div className="space-y-2">
              <AlertDialogTitle>Publish this activity?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-sm text-text-muted-warm">
                  <p>
                    Registration will open at{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-text-warm">
                      /register/{activity.slug}
                    </code>
                    . Confirm these details are correct.
                  </p>

                  <dl className="grid gap-2 rounded-md border border-border-warm bg-muted/30 p-3 text-text-warm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        Activity
                      </dt>
                      <dd className="mt-0.5">{activity.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        Schedule
                      </dt>
                      <dd className="mt-0.5">{activity.schedule}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        Location
                      </dt>
                      <dd className="mt-0.5">{activity.location}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        Community · category
                      </dt>
                      <dd className="mt-0.5">
                        {activity.communityLabel} · {activity.category}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        Registrations
                      </dt>
                      <dd className="mt-0.5">{capLabel}</dd>
                    </div>
                  </dl>

                  <div className="space-y-2">
                    <p className="font-medium text-text-warm">After publish, you cannot change:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Schedule and event date/time (unpublish from Overview to edit)</li>
                      <li>
                        Replacing the whole form with a template (unpublish from Overview)
                      </li>
                      <li>
                        The public registration path{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          /register/{activity.slug}
                        </code>
                      </li>
                    </ul>
                    <p>
                      You can still update design, form fields, capacity, and branding while
                      live unless your plan restricts it.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            disabled={isPublishing}
            onClick={onConfirm}
          >
            {isPublishing ? "Publishing…" : "Publish"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
