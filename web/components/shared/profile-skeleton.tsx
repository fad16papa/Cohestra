import { cn } from "@/lib/utils";

type ProfileSkeletonProps = {
  className?: string;
};

export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Loading profile">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded-md bg-muted/70" />
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-muted" />
            <div className="h-4 w-64 rounded-md bg-muted/70" />
          </div>
        </div>
      </div>

      <div className="animate-pulse rounded-xl border border-border-warm bg-card p-5">
        <div className="h-5 w-40 rounded-md bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-10 rounded-lg bg-muted/80" />
          <div className="h-10 rounded-lg bg-muted/80" />
          <div className="h-10 rounded-lg bg-muted/80 sm:col-span-2" />
        </div>
      </div>

      <div className="animate-pulse rounded-xl border border-border-warm bg-card p-5">
        <div className="h-5 w-36 rounded-md bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-12 rounded-lg bg-muted/70" />
          <div className="h-12 rounded-lg bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
