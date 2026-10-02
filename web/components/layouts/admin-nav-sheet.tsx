"use client";

import { useState, type RefObject } from "react";
import { CalendarDays } from "lucide-react";

import { CohestraLogo } from "@/components/marketing/cohestra-logo";
import { AdminNavFooter } from "@/components/layouts/admin-nav-footer";
import { AdminNavLinks } from "@/components/layouts/admin-nav-links";
import { useAdminShell } from "@/components/layouts/admin-shell-context";
import { LimitMeter } from "@/components/shell/limit-meter";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { moreSheetNavItems } from "@/lib/admin-mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AdminNavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
};

export function AdminNavSheet({
  open,
  onOpenChange,
  restoreFocusRef,
}: AdminNavSheetProps) {
  const { shell } = useTenantShell();
  const { setCalendarOpen } = useAdminShell();
  const [restoreFocus, setRestoreFocus] = useState(true);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRestoreFocus(true);
    }
  }

  function closeSheet() {
    onOpenChange(false);
  }

  function openCalendar() {
    setRestoreFocus(false);
    if (!setCalendarOpen(true)) {
      setRestoreFocus(true);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[min(100vw-2rem,20rem)] flex-col p-0"
        finalFocus={restoreFocus ? restoreFocusRef : undefined}
      >
        <SheetHeader className="shrink-0 border-b border-border-warm text-left">
          <SheetTitle className="flex items-center gap-2 text-section">
            <CohestraLogo href={null} showWordmark={false} size="sm" />
            Cohestra
          </SheetTitle>
          {shell ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <PlanBadge plan={shell.plan} />
              {shell.isComplimentary ? <SponsoredBadge /> : null}
            </div>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <AdminNavLinks
            items={moreSheetNavItems()}
            landmarkLabel="More destinations"
            onNavigate={closeSheet}
          />
          <Button
            type="button"
            variant="ghost"
            className="mt-2 flex min-h-11 w-full items-center justify-start gap-3 px-3 text-sm font-medium text-foreground"
            aria-haspopup="dialog"
            onClick={openCalendar}
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            Calendar
          </Button>
        </div>

        {shell?.limitDials?.length ? (
          <div className="shrink-0 border-t border-border-warm p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted-warm">
              Plan headroom
            </p>
            <LimitMeter dials={shell.limitDials} compact />
          </div>
        ) : null}

        <AdminNavFooter onNavigate={closeSheet} className="shrink-0" />
      </SheetContent>
    </Sheet>
  );
}
