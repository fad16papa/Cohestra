"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AdminNavSheet } from "@/components/layouts/admin-nav-sheet";
import { useAdminShell } from "@/components/layouts/admin-shell-context";
import { cn } from "@/lib/utils";

type TabItem = {
  key: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  opensMenu?: boolean;
};

const tabItems: TabItem[] = [
  {
    key: "home",
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (pathname) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
  },
  {
    key: "activities",
    label: "Activities",
    href: "/activities",
    icon: CalendarDays,
    isActive: (pathname) => pathname.startsWith("/activities"),
  },
  {
    key: "clients",
    label: "Clients",
    href: "/clients",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/clients"),
  },
  {
    key: "more",
    label: "More",
    icon: Menu,
    isActive: (pathname) =>
      pathname.startsWith("/campaigns") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/settings"),
    opensMenu: true,
  },
];

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
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = item.opensMenu
              ? navSheetOpen || item.isActive(pathname)
              : item.isActive(pathname);

            if (item.opensMenu) {
              return (
                <li key={item.key} className="flex-1">
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setNavSheetOpen(true)}
                    aria-expanded={navSheetOpen}
                    aria-haspopup="dialog"
                    className={cn(
                      "flex min-h-11 w-full flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium motion-press",
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
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium motion-press",
                    active ? "text-text-link" : "text-text-muted-warm"
                  )}
                  aria-current={active ? "page" : undefined}
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
