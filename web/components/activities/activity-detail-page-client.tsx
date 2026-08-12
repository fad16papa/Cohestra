"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";

import { ActivityDesignTab } from "@/components/activities/activity-design-tab";
import { ActivityCapacityPanel } from "@/components/activities/activity-capacity-panel";
import { ActivityFormTab } from "@/components/activities/activity-form-tab";
import { ActivityPublishControls } from "@/components/activities/activity-publish-controls";
import { ActivityScheduleConflictAlert } from "@/components/activities/activity-schedule-conflict-alert";
import { ActivityShareKitPanel } from "@/components/activities/activity-share-kit-panel";
import { ActivityRegistrationsTab } from "@/components/activities/activity-registrations-tab";
import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { useActivityScheduleConflicts } from "@/components/activities/use-activity-schedule-conflicts";
import { useAuth } from "@/components/auth/auth-provider";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { fetchActivityById, type Activity } from "@/lib/activities-api";
import { getPublishGateIssues } from "@/lib/form-schema-utils";
import { cn } from "@/lib/utils";

type ActivityDetailTab = "overview" | "design" | "form" | "registrations" | "share";

const ACTIVITY_TABS: { id: ActivityDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Design" },
  { id: "form", label: "Form" },
  { id: "registrations", label: "Registrations" },
  { id: "share", label: "Share kit" },
];

function isActivityDetailTab(value: string | null): value is ActivityDetailTab {
  return (
    value === "overview" ||
    value === "design" ||
    value === "form" ||
    value === "registrations" ||
    value === "share"
  );
}

type ActivityDetailPageClientProps = {
  id: string;
};

function ActivityBackLink() {
  return (
    <Link
      href="/activities"
      className="inline-flex items-center gap-2 text-sm text-text-muted-warm transition-colors hover:text-text-warm"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      Back to activities
    </Link>
  );
}

function ActivityQuickFacts({ activity }: { activity: Activity }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          <Calendar className="size-3.5" aria-hidden />
          Schedule
        </dt>
        <dd className="text-sm text-text-warm">{activity.schedule}</dd>
      </div>
      <div className="space-y-1">
        <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          <MapPin className="size-3.5" aria-hidden />
          Location
        </dt>
        <dd className="text-sm text-text-warm">{activity.location}</dd>
      </div>
      <div className="space-y-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Registrations
        </dt>
        <dd className="text-sm text-text-warm">
          {activity.maxRegistrants != null
            ? `${activity.registrationCount} / ${activity.maxRegistrants}`
            : `${activity.registrationCount} (no cap)`}
        </dd>
      </div>
      <div className="space-y-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Public URL
        </dt>
        <dd className="text-sm">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-text-warm">
            /register/{activity.slug}
          </code>
        </dd>
      </div>
    </dl>
  );
}

export function ActivityDetailPageClient({ id }: ActivityDetailPageClientProps) {
  const { authFetch } = useAuth();
  const {
    getConflictsForActivity,
    ready: conflictsReady,
    error: conflictError,
    refresh,
  } = useActivityScheduleConflicts();
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityDetailTab>(() => {
    const tab = searchParams.get("tab");
    return isActivityDetailTab(tab) ? tab : "overview";
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (isActivityDetailTab(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useAdminPageMeta(
    activity ? { title: activity.name, breadcrumbTail: activity.name } : null
  );

  useEffect(() => {
    let cancelled = false;

    void fetchActivityById(authFetch, id)
      .then((result) => {
        if (!cancelled) {
          setActivity(result);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load activity."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  const handleActivityUpdated = useCallback(
    (updated: Activity) => {
      setActivity(updated);
      refresh();
    },
    [refresh]
  );

  if (loadError) {
    return (
      <ProductErrorState
        message={loadError}
        onRetry={() => window.location.reload()}
        backHref="/activities"
        backLabel="Back to activities"
      />
    );
  }

  if (!activity) {
    return (
      <div className="space-y-4">
        <ActivityBackLink />
        <p className="text-sm text-text-muted-warm">Loading activity…</p>
      </div>
    );
  }

  const publishGateIssues = getPublishGateIssues(activity.formSchema, {
    slug: activity.slug,
  });
  const scheduleConflicts =
    conflictsReady && !conflictError
      ? getConflictsForActivity(activity.id)
      : [];

  return (
    <div className="space-y-6">
      <ActivityBackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-display-sm text-text-warm">{activity.name}</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            {activity.communityLabel} · {activity.category}
          </p>
        </div>
        <ActivityStatusBadge status={activity.status} />
      </div>

      {conflictError ? (
        <p role="status" className="text-sm text-text-muted-warm">
          Schedule conflict check unavailable: {conflictError}
        </p>
      ) : null}

      {scheduleConflicts.length > 0 ? (
        <ActivityScheduleConflictAlert
          conflictingActivities={scheduleConflicts}
          showLinks
        />
      ) : null}

      <nav
        role="tablist"
        aria-label="Activity sections"
        className="flex gap-1 overflow-x-auto border-b border-border-warm"
      >
        {ACTIVITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px",
              activeTab === tab.id
                ? "border-primary text-text-warm"
                : "border-transparent text-text-muted-warm hover:text-text-warm"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <ActivityPublishControls
            activity={activity}
            onActivityUpdated={handleActivityUpdated}
          />
          <ActivityQuickFacts activity={activity} />
          <ActivityCapacityPanel
            activity={activity}
            onActivityUpdated={handleActivityUpdated}
          />
        </div>
      ) : null}

      <div hidden={activeTab !== "design"}>
        <ActivityDesignTab
          key={activity.id}
          activity={activity}
          onActivityUpdated={handleActivityUpdated}
        />
      </div>

      <div hidden={activeTab !== "form"}>
        <ActivityFormTab
          key={activity.id}
          activity={activity}
          onActivityUpdated={handleActivityUpdated}
        />
      </div>

      {activeTab === "registrations" ? (
        <ActivityRegistrationsTab activityId={activity.id} />
      ) : null}

      <div hidden={activeTab !== "share"}>
        <ActivityShareKitPanel
          activity={activity}
          publishGateIssues={publishGateIssues}
        />
      </div>
    </div>
  );
}
