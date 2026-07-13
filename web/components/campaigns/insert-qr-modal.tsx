"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/activities-api";

type InsertQrModalProps = {
  open: boolean;
  onClose: () => void;
  activities: Activity[];
  communityFilter?: string;
  onInsert: (activityId: string, altText: string) => void;
};

export function InsertQrModal({
  open,
  onClose,
  activities,
  communityFilter,
  onInsert,
}: InsertQrModalProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [altText, setAltText] = useState("Scan to register");

  const publishedActivities = useMemo(() => {
    const normalizedCommunity = communityFilter?.trim().toLowerCase();
    return activities
      .filter((activity) => activity.status === "published")
      .filter((activity) =>
        normalizedCommunity
          ? activity.communityLabel.toLowerCase() === normalizedCommunity
          : true
      )
      .filter((activity) => {
        if (!search.trim()) {
          return true;
        }

        const query = search.trim().toLowerCase();
        return (
          activity.name.toLowerCase().includes(query) ||
          activity.communityLabel.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, communityFilter, search]);

  if (!open) {
    return null;
  }

  const selected = publishedActivities.find((activity) => activity.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insert-qr-title"
        className="w-full max-w-lg rounded-xl border border-border-warm bg-card p-5 shadow-xl"
      >
        <h3 id="insert-qr-title" className="text-sm font-semibold text-text-warm">
          Insert activity QR code
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Choose a published activity. The registration QR will be embedded in your email.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-activity-search">Search activities</Label>
            <Input
              id="qr-activity-search"
              value={search}
              placeholder="Search by name or community…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qr-activity-select">Activity</Label>
            <select
              id="qr-activity-select"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                const activity = publishedActivities.find((item) => item.id === event.target.value);
                if (activity) {
                  setAltText(`Scan to register for ${activity.name}`);
                }
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a published activity…</option>
              {publishedActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name} · {activity.communityLabel}
                </option>
              ))}
            </select>
          </div>

          {publishedActivities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-warm px-3 py-4 text-sm text-text-muted-warm">
              No published activities match this filter.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="qr-alt-text">Alt text</Label>
            <Input
              id="qr-alt-text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onInsert(selected.id, altText.trim() || `Scan to register for ${selected.name}`);
              }
            }}
          >
            Insert QR
          </Button>
        </div>
      </div>
    </div>
  );
}
