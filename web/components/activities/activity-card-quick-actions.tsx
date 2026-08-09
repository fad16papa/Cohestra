"use client";

import Link from "next/link";
import { useState } from "react";
import { Link2, List, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  fetchActivityRegistrationLink,
  type Activity,
} from "@/lib/activities-api";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

type ActivityCardQuickActionsProps = {
  activity: Activity;
  className?: string;
};

function buildClientsHref(activity: Activity): string {
  const params = new URLSearchParams();
  params.set("activityId", activity.id);
  params.set("activityName", activity.name);
  return `/clients?${params.toString()}`;
}

export function ActivityCardQuickActions({
  activity,
  className,
}: ActivityCardQuickActionsProps) {
  const { authFetch } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const isPublished = activity.status === "published";
  const registrationCount = activity.registrationCount;
  const registrationsLabel =
    registrationCount > 0
      ? `Registrations (${registrationCount})`
      : "Registrations";
  const clientsLabel =
    registrationCount > 0 ? `Clients (${registrationCount})` : "Clients";

  async function handleCopyLink(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isPublished || isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      const registrationLink = await fetchActivityRegistrationLink(
        authFetch,
        activity.id
      );
      const copied = await copyTextToClipboard(registrationLink.url);
      if (copied) {
        showSuccessToast("Link copied.");
      } else {
        showErrorToast("Select the URL and copy manually (Ctrl+C).");
      }
    } catch (copyError) {
      showErrorToast(
        copyError instanceof Error
          ? copyError.message
          : "Could not copy registration link."
      );
    } finally {
      setIsCopying(false);
    }
  }

  function stopCardNavigation(event: React.MouseEvent) {
    event.stopPropagation();
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-t border-border-warm px-4 py-3 sm:px-6",
        className
      )}
      onClick={stopCardNavigation}
    >
      {isPublished ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={isCopying}
          onClick={(event) => void handleCopyLink(event)}
        >
          <Link2 className="size-3.5" aria-hidden />
          {isCopying ? "Copying…" : "Copy link"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled
          title="Publish to get a registration link"
        >
          <Link2 className="size-3.5" aria-hidden />
          Copy link
        </Button>
      )}

      <Link
        href={`/activities/${activity.id}?tab=registrations`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        onClick={stopCardNavigation}
      >
        <List className="size-3.5" aria-hidden />
        {registrationsLabel}
      </Link>

      <Link
        href={buildClientsHref(activity)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        onClick={stopCardNavigation}
      >
        <Users className="size-3.5" aria-hidden />
        {clientsLabel}
      </Link>
    </div>
  );
}
