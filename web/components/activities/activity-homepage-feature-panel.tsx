"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Activity } from "@/lib/activities-api";

type ActivityHomepageFeaturePanelProps = {
  activity: Activity;
};

export function ActivityHomepageFeaturePanel({
  activity,
}: ActivityHomepageFeaturePanelProps) {
  const isPublished = activity.status === "published";

  return (
    <Card className="border-border-warm">
      <CardHeader>
        <CardTitle className="text-section text-text-warm">Public site</CardTitle>
        <CardDescription className="text-text-muted-warm">
          How this activity appears on your live homepage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPublished ? (
          <p className="text-sm text-text-muted-warm">
            Published activities automatically appear in the Upcoming activities
            section on your public homepage. Visitors can also register directly
            via the activity link or QR code.
          </p>
        ) : (
          <p className="text-sm text-text-muted-warm">
            Publish this activity to list it on your public homepage and open
            registration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
