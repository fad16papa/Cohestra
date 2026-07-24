"use client";

import { AdminNavLinks } from "@/components/layouts/admin-nav-links";
import { LimitMeter } from "@/components/shell/limit-meter";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  className?: string;
};

export function AdminSidebar({ className }: AdminSidebarProps) {
  const { shell } = useTenantShell();

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border-warm bg-card/95 backdrop-blur-sm",
        "w-16 lg:w-60",
        className
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border-warm px-3 lg:px-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-sm"
        >
          CO
        </span>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold text-text-warm">Cohestra</p>
          <p className="truncate text-xs text-text-muted-warm">Community platform</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 lg:p-3">
        <AdminNavLinks compact />
      </div>

      {shell?.limitDials?.length ? (
        <div className="hidden border-t border-border-warm p-3 lg:block">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted-warm">
            Plan headroom
          </p>
          <LimitMeter dials={shell.limitDials} compact />
        </div>
      ) : null}
    </aside>
  );
}
