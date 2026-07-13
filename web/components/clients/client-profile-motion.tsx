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
        "animate-fade-in-up motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-px",
        className
      )}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {children}
    </div>
  );
}

export const clientProfileFieldRowClassName =
  "rounded-lg px-2 py-1.5 motion-safe:transition-colors motion-safe:duration-200 motion-safe:hover:bg-muted/30";

export const clientProfileCardClassName =
  "motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-sm";
