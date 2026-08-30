"use client";

import { RefreshCw } from "lucide-react";

import { RegistrationMarkdownLiteCopy } from "@/components/registration/registration-markdown-lite-copy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActivityStatus } from "@/lib/activities-api";
import { PUBLIC_PLAN_REGISTRATION_LIMIT_COPY } from "@/lib/public-registration-messages";
import {
  type PublicRegistrationUnavailableReason,
  registrationUnavailablePlatformCopy,
  resolveRegistrationUnavailableChip,
} from "@/lib/registration-unavailable";

type PublicRegistrationUnavailableProps = {
  slug: string;
  activityName?: string;
  activityStatus?: ActivityStatus;
  closedMessage?: string | null;
  reason: PublicRegistrationUnavailableReason;
};

function resolvePlatformCopy(reason: PublicRegistrationUnavailableReason) {
  if (reason === "plan-limit") {
    return PUBLIC_PLAN_REGISTRATION_LIMIT_COPY;
  }

  if (reason === "error") {
    return {
      title: "Could not load registration",
      description:
        "We couldn't load this registration page. Please try again in a moment.",
    };
  }

  return registrationUnavailablePlatformCopy[reason];
}

export function PublicRegistrationUnavailable({
  slug,
  activityName,
  activityStatus,
  closedMessage = null,
  reason,
}: PublicRegistrationUnavailableProps) {
  const platformCopy = resolvePlatformCopy(reason);
  const reasonChip = resolveRegistrationUnavailableChip(reason, activityStatus);
  const operatorCopy = closedMessage?.trim() ?? "";

  return (
    <Card className="border-border-warm bg-card">
      <CardHeader className="text-center">
        <CardDescription className="text-text-muted-warm">
          Public registration
        </CardDescription>
        {reasonChip ? (
          <p className="mt-2">
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              {reasonChip}
            </span>
          </p>
        ) : null}
        {!operatorCopy ? (
          <CardTitle className="text-public-hero text-text-warm">
            {platformCopy.title}
          </CardTitle>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-center text-text-muted-warm">
        {activityName ? (
          <p className="text-sm font-medium text-text-warm">{activityName}</p>
        ) : null}
        {operatorCopy ? (
          <RegistrationMarkdownLiteCopy
            copy={operatorCopy}
            className="space-y-3 text-left sm:text-center"
            paragraphClassName="text-sm leading-relaxed text-text-warm"
          />
        ) : (
          <p>{platformCopy.description}</p>
        )}
        {reason === "not-found" ? (
          <p className="text-xs">
            Link:{" "}
            <code className="rounded bg-muted px-1 py-0.5">{slug}</code>
          </p>
        ) : null}
        {reason === "error" ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
