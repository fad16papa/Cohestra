import { cn } from "@/lib/utils";

type ListSkeletonProps = {
  rows?: number;
  className?: string;
};

export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-border-warm bg-card px-4 py-4"
        >
          <div className="size-10 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded-md bg-muted" />
            <div className="h-3 w-1/2 rounded-md bg-muted/70" />
          </div>
          <div className="hidden h-6 w-20 rounded-full bg-muted sm:block" />
        </div>
      ))}
    </div>
  );
}

type MetricSkeletonProps = {
  count?: number;
};

export function MetricSkeletonGrid({ count = 4 }: MetricSkeletonProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Loading metrics"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-border-warm bg-card/80 px-5 py-6"
        >
          <div className="h-8 w-16 rounded-md bg-muted" />
          <div className="mt-3 h-4 w-24 rounded-md bg-muted/80" />
          <div className="mt-2 h-3 w-32 rounded-md bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

type CardGridSkeletonProps = {
  count?: number;
};

export function CardGridSkeleton({ count = 6 }: CardGridSkeletonProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-border-warm bg-card p-5"
        >
          <div className="h-5 w-2/3 rounded-md bg-muted" />
          <div className="mt-3 h-3 w-full rounded-md bg-muted/70" />
          <div className="mt-2 h-3 w-4/5 rounded-md bg-muted/60" />
          <div className="mt-6 h-6 w-24 rounded-full bg-muted/80" />
        </div>
      ))}
    </div>
  );
}
