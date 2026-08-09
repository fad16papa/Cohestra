import { cn } from "@/lib/utils";

type ClientProfileSectionProps = {
  children: React.ReactNode;
  animationDelayMs?: number;
  className?: string;
};

/** Staggered enter + subtle hover lift for client profile stack. */
export function ClientProfileSection({
  children,
  animationDelayMs = 0,
  className,
}: ClientProfileSectionProps) {
  return (
    <div
      className={cn(
        "animate-fade-in-up motion-safe:transition-[transform,box-shadow,opacity] motion-safe:duration-300 motion-safe:hover:-translate-y-px",
        className
      )}
      style={{ animationDelay: `${animationDelayMs}ms` }}
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export const clientProfileFieldRowClassName =
  "rounded-lg px-2 py-1.5 motion-safe:transition-colors motion-safe:duration-200 motion-safe:hover:bg-muted/30";

export const clientProfileCardClassName =
  "motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-sm";
