"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatScheduleForStorage,
  minScheduleDateTimeLocal,
} from "@/lib/geolocation";

type ActivitySchedulePickerProps = {
  value: string;
  onChange: (dateTimeLocal: string) => void;
  disabled?: boolean;
};

const dateTimeInputClassName =
  "pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:cursor-pointer";

export function ActivitySchedulePicker({
  value,
  onChange,
  disabled = false,
}: ActivitySchedulePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = value ? formatScheduleForStorage(value) : null;

  function openPicker() {
    const input = inputRef.current;
    if (!input || disabled) {
      return;
    }

    input.focus();

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // showPicker can throw if already open — ignore
      }
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="activity-schedule">Schedule</Label>
      <div className="relative">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Open date and time picker"
          onClick={openPicker}
          className="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-text-muted-warm disabled:opacity-50"
        >
          <Calendar className="size-4" aria-hidden />
        </button>
        <Input
          ref={inputRef}
          id="activity-schedule"
          type="datetime-local"
          required
          disabled={disabled}
          value={value}
          min={minScheduleDateTimeLocal()}
          onChange={(event) => onChange(event.target.value)}
          className={dateTimeInputClassName}
        />
      </div>
      <p className="min-h-8 text-xs text-text-muted-warm">
        {preview
          ? `Saved as: ${preview}`
          : "Click the field to open the calendar and pick date and time."}
      </p>
    </div>
  );
}
