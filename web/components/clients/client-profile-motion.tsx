import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ClientProfileSectionProps = {
  children: ReactNode;
  animationDelayMs?: number;
  className?: string;
};

/** Profile stack section. Route enter owns page motion; hover is press-level only. */
export function ClientProfileSection({
  children,
  animationDelayMs: _animationDelayMs = 0,
  className,
}: ClientProfileSectionProps) {
  return (
    <div
      className={cn(
        "motion-press hover:-translate-y-px",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Smooth height expand/collapse for profile cards (respects reduced motion). */
export function ClientProfileExpandableRegion({
  expanded,
  children,
  className,
}: {
  expanded: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export const clientProfileFieldRowClassName =
  "rounded-lg px-2 py-1.5 motion-local hover:bg-muted/30";

export const clientProfileCardClassName =
  "motion-press hover:shadow-sm";
