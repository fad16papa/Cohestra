"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { AdminNavSheet } from "@/components/layouts/admin-nav-sheet";
import { useAdminShell } from "@/components/layouts/admin-shell-context";
import { mobileTabItems } from "@/lib/admin-mobile-nav";
import { cn } from "@/lib/utils";

export function AdminMobileTabBar() {
  const pathname = usePathname();
  const { navSheetOpen, setNavSheetOpen } = useAdminShell();
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border-warm bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            const destinationActive = item.isActive(pathname);
            const active = item.opensMenu
              ? navSheetOpen || destinationActive
              : destinationActive;

            if (item.opensMenu) {
              return (
                <li key={item.key} className="flex-1">
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setNavSheetOpen(true)}
                    aria-expanded={navSheetOpen}
                    aria-haspopup="dialog"
                    aria-current={destinationActive ? "page" : undefined}
                    aria-label={active ? "More, selected" : "More"}
                    className={cn(
                      "flex min-h-11 w-full min-w-11 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium motion-press",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-text-link" : "text-text-muted-warm"
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href ?? "/dashboard"}
                  aria-current={active ? "page" : undefined}
                  aria-label={active ? `${item.label}, selected` : item.label}
                  className={cn(
                    "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium motion-press",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-text-link" : "text-text-muted-warm"
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AdminNavSheet
        open={navSheetOpen}
        onOpenChange={setNavSheetOpen}
        restoreFocusRef={moreButtonRef}
      />
    </>
  );
}
