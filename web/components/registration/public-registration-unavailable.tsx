"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PublicRegistrationUnavailableProps = {
  slug: string;
  activityName?: string;
  reason: "not-found" | "unavailable" | "error";
};

const reasonCopy: Record<
  PublicRegistrationUnavailableProps["reason"],
  { title: string; description: string }
> = {
  "not-found": {
    title: "Activity not found",
    description: "This registration link may be incorrect or no longer available.",
  },
  unavailable: {
    title: "Registration closed",
    description: "This activity is no longer accepting registrations.",
  },
  error: {
    title: "Could not load registration",
    description:
      "We couldn't load this registration page. Please try again in a moment.",
  },
};

export function PublicRegistrationUnavailable({
  slug,
  activityName,
  reason,
}: PublicRegistrationUnavailableProps) {
  const copy = reasonCopy[reason];

  return (
    <Card className="border-border-warm bg-card">
      <CardHeader className="text-center">
        <CardDescription className="text-text-muted-warm">
          Public registration
        </CardDescription>
        <CardTitle className="text-public-hero text-text-warm">
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-text-muted-warm">
        {activityName ? (
          <p className="text-sm text-text-warm">{activityName}</p>
        ) : null}
        <p>{copy.description}</p>
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
