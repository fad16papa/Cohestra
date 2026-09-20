"use client";

import { cn } from "@/lib/utils";
import type { RegistrationPreviewViewport } from "@/lib/registration-preview-viewport";

export type { RegistrationPreviewViewport };

type RegistrationPreviewViewportToggleProps = {
  value: RegistrationPreviewViewport;
  onChange: (viewport: RegistrationPreviewViewport) => void;
  className?: string;
};

const OPTIONS: Array<{
  id: RegistrationPreviewViewport;
  label: string;
}> = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function RegistrationPreviewViewportToggle({
  value,
  onChange,
  className,
}: RegistrationPreviewViewportToggleProps) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-lg border border-border-warm p-1",
        className
      )}
      role="radiogroup"
      aria-label="Preview viewport"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <label
            key={option.id}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1 text-xs font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-text-muted-warm hover:text-text-warm"
            )}
          >
            <input
              type="radio"
              name="preview-viewport"
              value={option.id}
              checked={selected}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
