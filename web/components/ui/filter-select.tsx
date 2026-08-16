import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const filterSelectClassName =
  "h-9 w-full cursor-pointer appearance-none rounded-xl border-0 bg-muted/55 px-3.5 pr-9 text-sm font-medium text-text-warm shadow-none outline-none transition-[background-color,box-shadow,color] hover:bg-muted/75 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted/35 dark:hover:bg-muted/50";

type FilterSelectProps = React.ComponentProps<"select"> & {
  /** Highlights the control when a non-default filter is applied. */
  active?: boolean;
};

const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  ({ className, active = false, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          data-slot="filter-select"
          className={cn(
            filterSelectClassName,
            active &&
              "bg-primary/10 text-primary hover:bg-primary/15 focus-visible:bg-primary/10 focus-visible:ring-primary/35 dark:bg-primary/15 dark:hover:bg-primary/20",
            className
          )}
          {...props}
        />
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2",
            active ? "text-primary/70" : "text-text-muted-warm"
          )}
        />
      </div>
    );
  }
);

FilterSelect.displayName = "FilterSelect";

export { FilterSelect };
