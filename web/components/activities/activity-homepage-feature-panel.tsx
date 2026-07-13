"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { updateActivityShowOnHomepage, type Activity } from "@/lib/activities-api";

type ActivityHomepageFeaturePanelProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

export function ActivityHomepageFeaturePanel({
  activity,
  onActivityUpdated,
}: ActivityHomepageFeaturePanelProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [showOnHomepage, setShowOnHomepage] = useState(activity.showOnHomepage);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShowOnHomepage(activity.showOnHomepage);
  }, [activity.id, activity.showOnHomepage]);

  const isPublished = activity.status === "published";
  const isArchived = activity.status === "archived";
  const isDirty = showOnHomepage !== activity.showOnHomepage;

  function handleSave() {
    if (!isDirty || isSaving || !isPublished) {
      return;
    }

    setIsSaving(true);
    void updateActivityShowOnHomepage(authFetch, activity.id, showOnHomepage)
      .then((updated) => {
        onActivityUpdated(updated);
        showToast(
          showOnHomepage
            ? "Activity will appear on your public site."
            : "Activity hidden from your public site."
        );
      })
      .catch((error) => {
        showToast(
          error instanceof Error
            ? error.message
            : "Could not update homepage visibility."
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <Card className="border-border-warm">
      <CardHeader>
        <CardTitle className="text-section text-text-warm">Public site</CardTitle>
        <CardDescription className="text-text-muted-warm">
          Control whether this activity appears in the homepage upcoming block.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={showOnHomepage}
            disabled={!isPublished || isArchived || isSaving}
            onChange={(event) => setShowOnHomepage(event.target.checked)}
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-text-warm">
              Feature on your public site
            </span>
            <span className="block text-sm text-text-muted-warm">
              When checked, this activity can appear in the homepage upcoming
              section. Direct registration links still work when unchecked.
            </span>
          </span>
        </label>

        {!isPublished ? (
          <p className="text-sm text-text-muted-warm">
            Publish this activity to feature it on your public site.
          </p>
        ) : null}

        {isPublished ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
            {isDirty ? (
              <span className="text-xs text-amber-700 dark:text-amber-300">
                Unsaved change
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
