import { cn } from "@/lib/utils";

type ActivitySignUpsPausedBadgeProps = {
  className?: string;
};

export function ActivitySignUpsPausedBadge({
  className,
}: ActivitySignUpsPausedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive",
        className
      )}
    >
      Sign-ups paused
    </span>
  );
}
