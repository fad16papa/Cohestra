import { Lock } from "lucide-react";

import type { NavRequiredPlan } from "@/lib/admin-nav-entitlements";
import { cn } from "@/lib/utils";

type AdminNavLockMarkProps = {
  requiredPlan: NavRequiredPlan;
  compact?: boolean;
};

export function AdminNavLockMark({ requiredPlan, compact = false }: AdminNavLockMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-text-muted-warm",
        compact ? "hidden lg:ml-auto lg:inline-flex" : "ml-auto"
      )}
      aria-hidden
    >
      <Lock
        className="size-3.5 shrink-0 text-current forced-colors:rounded-[2px] forced-colors:outline forced-colors:outline-current"
      />
      <span className="text-[11px] font-medium tracking-wide">{requiredPlan}</span>
    </span>
  );
}
