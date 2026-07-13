"use client";

import { useAuth } from "@/components/auth/auth-provider";
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
    <section className="relative overflow-hidden rounded-2xl border border-border-warm bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/3 size-40 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{formatTodayLabel()}</p>
          <h2 className="mt-1 text-display-sm text-text-warm">
            {getGreeting()}, {displayName}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted-warm">
            Your outreach cockpit — see what needs attention, then act in one click.
            Press{" "}
            <kbd className="rounded border border-border-warm bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>{" "}
            anytime to jump anywhere.
          </p>
        </div>
      </div>
    </section>
  );
}
