"use client";

import type { RefObject } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";

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

export type ArchiveActivityDialogVariant = "upcoming" | "past" | "draft";

type ArchiveActivityDialogProps = {
  open: boolean;
  variant: ArchiveActivityDialogVariant;
  activityName: string;
  activitySchedule: string;
  registrationPath: string;
  isArchiving: boolean;
  error?: string | null;
  finalFocus?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ArchiveActivityDialog({
  open,
  variant,
  activityName,
  activitySchedule,
  registrationPath,
  isArchiving,
  error = null,
  finalFocus,
  onOpenChange,
  onConfirm,
}: ArchiveActivityDialogProps) {
  const isUpcoming = variant === "upcoming";
  const isDraft = variant === "draft";
  const title = isUpcoming
    ? "Archive before this event?"
    : isDraft
      ? "Archive this draft?"
      : "Archive this activity?";
  const confirmLabel = isArchiving
    ? "Archiving…"
    : isDraft
      ? "Archive draft"
      : "Archive anyway";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isArchiving && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent
        finalFocus={finalFocus}
        className={
          isUpcoming
            ? "border-status-contacted/40 bg-card"
            : undefined
        }
      >
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={
                isUpcoming
                  ? "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-status-contacted/15 text-status-contacted"
                  : "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-muted-warm"
              }
            >
              {isUpcoming ? (
                <AlertTriangle className="size-4" aria-hidden />
              ) : (
                <CalendarClock className="size-4" aria-hidden />
              )}
            </span>
            <div className="space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-text-warm">{activityName}</span>
                {isDraft
                  ? " is still a draft. Archiving closes it for editing and publishing. The record stays in Activities as Archived."
                  : activitySchedule
                    ? (
                      <>
                        {" "}
                        is scheduled for{" "}
                        <span className="font-medium text-text-warm">{activitySchedule}</span>.
                      </>
                    )
                    : "."}
              </AlertDialogDescription>

              {isDraft ? (
                <p className="text-sm text-text-muted-warm">
                  Existing client and registration records stay in the CRM. This does not
                  delete the activity.
                </p>
              ) : isUpcoming ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-warm">
                  <li>
                    The public link{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {registrationPath}
                    </code>{" "}
                    will show registration closed.
                  </li>
                  <li>QR codes on flyers and posters will stop accepting new sign-ups.</li>
                  <li>New registrations will be blocked immediately.</li>
                  <li>
                    Existing registrations and client records stay in the CRM — nothing is
                    deleted.
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-text-muted-warm">
                  The registration page will close for new sign-ups. Existing registrations and
                  client records are kept.
                </p>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isArchiving}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
