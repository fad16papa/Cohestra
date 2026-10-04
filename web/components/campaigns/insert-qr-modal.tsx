"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const searchRef = useRef<HTMLInputElement>(null);
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

  const selected = publishedActivities.find((activity) => activity.id === selectedId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent initialFocus={searchRef} className="max-w-lg">
        <DialogHeader>
          <DialogTitle id="insert-qr-title">Insert activity QR code</DialogTitle>
          <DialogDescription>
            Choose a published activity. The registration QR will be embedded in your email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-activity-search">Search activities</Label>
            <Input
              ref={searchRef}
              id="qr-activity-search"
              className="min-h-12"
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
              className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
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
              className="min-h-12"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" className="min-h-12 min-w-11 px-4" />}
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            className="min-h-12 min-w-11 px-4"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onInsert(selected.id, altText.trim() || `Scan to register for ${selected.name}`);
              }
            }}
          >
            Insert QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
