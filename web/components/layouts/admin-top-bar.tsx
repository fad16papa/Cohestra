"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { AdminBreadcrumbs } from "@/components/layouts/admin-breadcrumbs";
import { AdminMobileNav } from "@/components/layouts/admin-mobile-nav";
import { useAdminShell } from "@/components/layouts/admin-shell-context";
import { AdminUserMenu } from "@/components/layouts/admin-user-menu";
import { UpdatedTime } from "@/components/layouts/updated-time";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getAdminBreadcrumbs } from "@/lib/admin-nav";

export function AdminTopBar() {
  const pathname = usePathname();
  const { openCommandPalette, pageMeta } = useAdminShell();
  const { shell } = useTenantShell();

  const breadcrumbs = getAdminBreadcrumbs(pathname).map((item, index, items) => {
    if (
      pageMeta?.breadcrumbTail &&
      index === items.length - 1
    ) {
      return { ...item, label: pageMeta.breadcrumbTail };
    }

    return item;
  });

  const pageTitle =
    pageMeta?.title ?? breadcrumbs[breadcrumbs.length - 1]?.label ?? "Admin";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border-warm bg-card/80 px-4 backdrop-blur-md md:px-6">
      <AdminMobileNav />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {breadcrumbs.length > 1 ? (
          <AdminBreadcrumbs items={breadcrumbs} className="hidden sm:flex" />
        ) : null}
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-section text-text-warm">{pageTitle}</h1>
          {shell ? (
            <div className="flex items-center gap-1.5">
              <PlanBadge plan={shell.plan} />
              {shell.isComplimentary ? <SponsoredBadge /> : null}
            </div>
          ) : null}
          <UpdatedTime />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden h-9 gap-2 border-border-warm bg-background/60 text-text-muted-warm hover:text-text-warm sm:inline-flex"
        onClick={openCommandPalette}
        aria-label="Open command palette"
      >
        <Search className="size-4" aria-hidden />
        <span>Search</span>
        <kbd className="rounded border border-border-warm bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={openCommandPalette}
        aria-label="Open command palette"
      >
        <Search className="size-4" />
      </Button>
      <ThemeToggle variant="admin" />
      <AdminUserMenu />
    </header>
  );
}

