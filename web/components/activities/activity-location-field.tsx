"use client";

import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActivityLocationFieldProps = {
  locationDetail: string;
  onLocationDetailChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string | null;
};

export function ActivityLocationField({
  locationDetail,
  onLocationDetailChange,
  disabled = false,
  helperText = null,
}: ActivityLocationFieldProps) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="activity-location">Location</Label>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted-warm"
          aria-hidden
        />
        <Input
          id="activity-location"
          required
          disabled={disabled}
          placeholder="Venue, city, or neighborhood"
          value={locationDetail}
          onChange={(event) => onLocationDetailChange(event.target.value)}
          className="pl-10"
        />
      </div>
      {helperText ? (
        <p className="text-xs text-text-muted-warm">{helperText}</p>
      ) : null}
    </div>
  );
}
