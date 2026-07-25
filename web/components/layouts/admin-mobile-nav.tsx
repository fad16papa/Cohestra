"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { AdminNavLinks } from "@/components/layouts/admin-nav-links";
import { LimitMeter } from "@/components/shell/limit-meter";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const { shell } = useTenantShell();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border-warm text-left">
          <SheetTitle className="flex items-center gap-2 text-section">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
              AL
            </span>
            Cohestra
          </SheetTitle>
          {shell ? (
            <div className="flex items-center gap-1.5 pt-2">
              <PlanBadge plan={shell.plan} />
              {shell.isComplimentary ? <SponsoredBadge /> : null}
            </div>
          ) : null}
        </SheetHeader>
        <div className="p-3">
          <AdminNavLinks onNavigate={() => setOpen(false)} />
        </div>
        {shell?.limitDials?.length ? (
          <div className="border-t border-border-warm p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted-warm">
              Plan headroom
            </p>
            <LimitMeter dials={shell.limitDials} compact />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
