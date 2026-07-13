"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActivityHomepageFeaturePanel } from "@/components/activities/activity-homepage-feature-panel";
import { ActivityBrandingPanel } from "@/components/activities/activity-branding-panel";
import { ActivityFormTab } from "@/components/activities/activity-form-tab";
import { ActivityPublishControls } from "@/components/activities/activity-publish-controls";
import { ActivityQrPanel } from "@/components/activities/activity-qr-panel";
import { ActivityRegistrationsTab } from "@/components/activities/activity-registrations-tab";
import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { useAdminPageMeta } from "@/components/layouts/admin-shell-context";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchActivityById, type Activity } from "@/lib/activities-api";
import { getPublishGateIssues } from "@/lib/form-schema-utils";

type ActivityDetailTab = "overview" | "form" | "registrations" | "qr";

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

export function ActivityDetailPageClient({ id }: ActivityDetailPageClientProps) {
  const { authFetch } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityDetailTab>("overview");

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
          setError(
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

  if (error) {
    return (
      <ProductErrorState
        message={error}
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

  const publishGateIssues = getPublishGateIssues(activity.formSchema);

  return (
    <div className="space-y-6">
      <ActivityBackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-display-sm text-text-warm">{activity.name}</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            {activity.communityLabel} · {activity.category}
          </p>
        </div>
        <ActivityStatusBadge status={activity.status} />
      </div>

      {activity.status === "draft" ? (
        <p
          role="status"
          className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        >
          Not live — publish to generate QR and link.
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Activity detail sections"
        className="flex flex-wrap gap-2 border-b border-border-warm pb-2"
      >
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "form", label: "Form" },
            { id: "registrations", label: "Registrations" },
            { id: "qr", label: "QR & Link" },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <ActivityPublishControls
            activity={activity}
            onActivityUpdated={setActivity}
          />
          <ActivityBrandingPanel
            key={activity.id}
            activity={activity}
            onActivityUpdated={setActivity}
          />
          <ActivityHomepageFeaturePanel
            activity={activity}
            onActivityUpdated={setActivity}
          />
          <Card className="border-border-warm">
            <CardHeader>
              <CardTitle className="text-section text-text-warm">
                Activity overview
              </CardTitle>
              <CardDescription className="text-text-muted-warm">
                Metadata and public URL for this lead engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-text-muted-warm">
              <p>{activity.schedule}</p>
              <p>{activity.location}</p>
              <p>
                Public slug:{" "}
                <code className="rounded bg-muted px-1 py-0.5">{activity.slug}</code>
              </p>
              <p>
                Use the QR &amp; Link tab after publishing to copy the public URL
                or download a QR code PNG.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div hidden={activeTab !== "form"}>
        <ActivityFormTab
          key={activity.id}
          activity={activity}
          onActivityUpdated={setActivity}
        />
      </div>

      {activeTab === "registrations" ? (
        <ActivityRegistrationsTab activityId={activity.id} />
      ) : null}

      <div hidden={activeTab !== "qr"}>
        <ActivityQrPanel
          activity={activity}
          publishGateIssues={publishGateIssues}
        />
      </div>
    </div>
  );
}

