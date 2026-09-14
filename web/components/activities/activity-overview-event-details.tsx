"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Link2, MapPin } from "lucide-react";

import {
  ActivityOverviewSchedule,
  ActivityOverviewScheduleLabel,
} from "@/components/activities/activity-overview-schedule";
import type { Activity } from "@/lib/activities-api";

type ActivityOverviewEventDetailsProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
  onScheduleDirtyChange?: (dirty: boolean) => void;
};

function FactBlock({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2">{label}</div>
      {children}
    </div>
  );
}

export function ActivityOverviewEventDetails({
  activity,
  onActivityUpdated,
  onScheduleDirtyChange,
}: ActivityOverviewEventDetailsProps) {
  return (
    <section
      aria-labelledby="activity-event-details-heading"
      className="rounded-xl border border-border-warm bg-card p-5"
    >
      <h3
        id="activity-event-details-heading"
        className="text-sm font-semibold text-text-warm"
      >
        Event details
      </h3>
      <p className="mt-1 text-sm text-text-muted-warm">
        Schedule and location appear on the public registration page. Set them before
        you publish.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-x-8">
        <FactBlock label={<ActivityOverviewScheduleLabel />}>
          <ActivityOverviewSchedule
            activity={activity}
            onActivityUpdated={onActivityUpdated}
            onDirtyChange={onScheduleDirtyChange}
          />
        </FactBlock>

        <FactBlock
          label={
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              Location
            </span>
          }
        >
          <p className="text-sm leading-relaxed text-text-warm">{activity.location}</p>
        </FactBlock>

        <FactBlock
          className="lg:col-span-2"
          label={
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              <Link2 className="size-3.5 shrink-0" aria-hidden />
              Public registration URL
            </span>
          }
        >
          <p className="text-sm text-text-muted-warm">
            Share this path after publish. The slug is fixed while the activity stays
            live.
          </p>
          <code className="mt-2 inline-block rounded-md bg-muted px-2 py-1 text-xs text-text-warm">
            /register/{activity.slug}
          </code>
          {activity.status === "published" ? (
            <p className="mt-2 text-xs">
              <Link
                href={`/register/${activity.slug}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open registration page
              </Link>
            </p>
          ) : null}
        </FactBlock>
      </div>
    </section>
  );
}
