"use client";

import { cn } from "@/lib/utils";

export type RegistrationPreviewViewport = "mobile" | "desktop";

type RegistrationPreviewViewportToggleProps = {
  value: RegistrationPreviewViewport;
  onChange: (viewport: RegistrationPreviewViewport) => void;
  className?: string;
};

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
      role="group"
      aria-label="Preview viewport"
    >
      <button
        type="button"
        aria-pressed={value === "mobile"}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium",
          value === "mobile"
            ? "bg-primary text-primary-foreground"
            : "text-text-muted-warm"
        )}
        onClick={() => onChange("mobile")}
      >
        Mobile
      </button>
      <button
        type="button"
        aria-pressed={value === "desktop"}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium",
          value === "desktop"
            ? "bg-primary text-primary-foreground"
            : "text-text-muted-warm"
        )}
        onClick={() => onChange("desktop")}
      >
        Desktop
      </button>
    </div>
  );
}
