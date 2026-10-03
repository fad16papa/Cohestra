"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { getDisplayNameFromEmail } from "@/lib/display-name";

function formatTodayLabel(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function DashboardGreetingHeader() {
  const { profile } = useAuth();
  const displayName = profile?.email
    ? getDisplayNameFromEmail(profile.email)
    : "Operator";

  return (
    <PageHeader
      title="Dashboard"
      description={
        <>
          <p>{formatTodayLabel()}</p>
          <p>
            {getGreeting()}, {displayName}
          </p>
        </>
      }
    />
  );
}
