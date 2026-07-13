"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type DeleteCatalogItemKind = "community" | "category";

type DeleteCatalogItemDialogProps = {
  kind: DeleteCatalogItemKind;
  open: boolean;
  name: string;
  activityCount: number;
  leadCount?: number;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onConfirm: () => void;
  onRenameInstead?: () => void;
};

const kindLabel: Record<DeleteCatalogItemKind, string> = {
  community: "community",
  category: "category",
};

export function DeleteCatalogItemDialog({
  kind,
  open,
  name,
  activityCount,
  leadCount,
  isDeleting,
  onOpenChange,
  onOpenChangeComplete,
  onConfirm,
  onRenameInstead,
}: DeleteCatalogItemDialogProps) {
  const label = kindLabel[kind];
  const isBlocked = activityCount > 0;

  function handleDismissPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleDismiss() {
    onOpenChange(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <AlertDialogContent
        className={isBlocked ? "border-status-contacted/40 bg-card" : undefined}
      >
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={
                isBlocked
                  ? "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-status-contacted/15 text-status-contacted"
                  : "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              }
            >
              {isBlocked ? (
                <AlertTriangle className="size-4" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
            </span>
            <div className="space-y-2">
              <AlertDialogTitle>
                {isBlocked ? `Can't delete this ${label} yet` : `Delete ${label}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-text-warm">{name}</span>
                {isBlocked ? (
                  <>
                    {" "}
                    is still linked to{" "}
                    <span className="font-medium text-text-warm">
                      {activityCount} {activityCount === 1 ? "activity" : "activities"}
                    </span>
                    .
                  </>
                ) : (
                  <> will be removed from the {label} list.</>
                )}
              </AlertDialogDescription>

              {isBlocked ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-warm">
                  <li>
                    Activities, registrations, and client records are{" "}
                    <span className="font-medium">not deleted</span> — this {label} is just a
                    catalog label.
                  </li>
                  <li>
                    Reassign those activities to another {label} before you can remove this one.
                    {kind === "community"
                      ? " Renaming this community updates all linked activities automatically."
                      : " Renaming this category updates all linked activities automatically."}
                  </li>
                  {kind === "community" && typeof leadCount === "number" && leadCount > 0 ? (
                    <li>
                      <span className="font-medium">{leadCount}</span>{" "}
                      {leadCount === 1 ? "lead is" : "leads are"} tied to activities in this
                      community — they stay in the CRM after reassignment.
                    </li>
                  ) : null}
                </ul>
              ) : (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-muted-warm">
                  <li>No activities use this {label} right now.</li>
                  <li>
                    Deleting removes only this catalog entry — not activities, registrations, or
                    clients.
                  </li>
                </ul>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onPointerDown={handleDismissPointerDown}
            onClick={handleDismiss}
          >
            {isBlocked ? "Close" : "Cancel"}
          </Button>
          {isBlocked && onRenameInstead ? (
            <AlertDialogAction
              disabled={isDeleting}
              onPointerDown={(event) => {
                event.preventDefault();
                onRenameInstead();
              }}
            >
              Rename instead
            </AlertDialogAction>
          ) : null}
          {!isBlocked ? (
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={onConfirm}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
