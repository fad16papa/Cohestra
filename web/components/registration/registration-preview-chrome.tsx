"use client";

import { Eye } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RegistrationPreviewFormStatus = "unsaved" | "saved";

type RegistrationPreviewChromeProps = {
  children: ReactNode;
  formStatus: RegistrationPreviewFormStatus;
  className?: string;
  scrollClassName?: string;
};

export function RegistrationPreviewChrome({
  children,
  formStatus,
  className,
  scrollClassName,
}: RegistrationPreviewChromeProps) {
  return (
    <div
      className={cn(
        "registration-preview-surface relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-warm bg-background",
        className
      )}
    >
      <div
        className={cn(
          "min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          scrollClassName
        )}
      >
        <div
          className="sticky top-0 z-20 border-b border-primary/20 bg-primary/10 px-4 py-3 backdrop-blur-sm sm:px-5"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Eye
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-text-warm">Preview mode</p>
                <p className="text-xs leading-relaxed text-text-muted-warm">
                  You&apos;re viewing the registration page as visitors will see it.
                  Submissions made here will not be recorded.
                </p>
              </div>
            </div>
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-muted-warm">
              {formStatus === "unsaved"
                ? "Previewing unsaved changes"
                : "Preview matches saved form"}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
