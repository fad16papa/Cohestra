"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { ActivityCountrySelect } from "@/components/activities/activity-country-select";
import { ActivityLocationField } from "@/components/activities/activity-location-field";
import { ActivitySchedulePicker } from "@/components/activities/activity-schedule-picker";
import { useActivityLocationDetection } from "@/components/activities/use-activity-location-detection";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createActivity } from "@/lib/activities-api";
import { fetchCategories } from "@/lib/categories-api";
import { fetchCommunities } from "@/lib/communities-api";
import { buildActivityLocation, defaultCountryCode } from "@/lib/countries";
import {
  defaultScheduleDateTimeLocal,
  formatScheduleForStorage,
} from "@/lib/geolocation";
import { cn } from "@/lib/utils";

export function CreateActivityForm() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [name, setName] = useState("");
  const [communityLabel, setCommunityLabel] = useState("");
  const [category, setCategory] = useState("");
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState(() =>
    defaultScheduleDateTimeLocal()
  );
  const [locationDetail, setLocationDetail] = useState("");
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { countryOptions, geoMessage, isDetecting } = useActivityLocationDetection(
    {
      onLocationDetailChange: setLocationDetail,
      onCountryCodeChange: setCountryCode,
    }
  );

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchCommunities(authFetch), fetchCategories(authFetch)])
      .then(([communityItems, categoryItems]) => {
        if (!cancelled) {
          setCommunities(communityItems);
          setCategories(categoryItems);
          setCatalogError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setCatalogError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load communities and categories."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const locationHelperText = isDetecting
    ? "Detecting your location…"
    : geoMessage;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const activity = await createActivity(authFetch, {
        name,
        communityLabel,
        category,
        schedule: formatScheduleForStorage(scheduleDateTime),
        location: buildActivityLocation(locationDetail, countryCode),
        status: "draft",
      });
      router.push(`/activities/${activity.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create activity."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Step 1 of 3
        </p>
        <h2 className="mt-1 text-display-sm text-text-warm">Activity details</h2>
        <p className="mt-2 text-sm text-text-muted-warm">
          Save the basics as a draft. Form configuration and publishing come next.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="activity-name">Activity name</Label>
          <Input
            id="activity-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="community-label">Community</Label>
          <select
            id="community-label"
            required
            value={communityLabel}
            onChange={(event) => setCommunityLabel(event.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select a community</option>
            {communities.map((community) => (
              <option key={community.id} value={community.name}>
                {community.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted-warm">
            Manage communities under{" "}
            <Link href="/activities/communities" className="underline hover:text-text-warm">
              Activities → Communities
            </Link>
            .
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity-category">Category</Label>
          <select
            id="activity-category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select a category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted-warm">
            Manage categories under{" "}
            <Link href="/activities/categories" className="underline hover:text-text-warm">
              Activities → Categories
            </Link>
            .
          </p>
        </div>

        <ActivitySchedulePicker
          value={scheduleDateTime}
          onChange={setScheduleDateTime}
          disabled={isSubmitting}
        />

        <ActivityCountrySelect
          countryCode={countryCode}
          countryOptions={countryOptions}
          onCountryCodeChange={setCountryCode}
          disabled={isSubmitting || isDetecting}
          helperText={
            isDetecting
              ? "Detecting your country from device location…"
              : "Where this activity takes place."
          }
        />

        <ActivityLocationField
          locationDetail={locationDetail}
          onLocationDetailChange={setLocationDetail}
          disabled={isSubmitting || isDetecting}
          helperText={locationHelperText}
        />
      </div>

      <p className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm">
        This activity will be saved as <strong>Draft</strong>.
      </p>

      {catalogError ? (
        <p role="alert" className="text-sm text-destructive">
          {catalogError}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save draft activity"}
        </Button>
        <Link href="/activities" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
