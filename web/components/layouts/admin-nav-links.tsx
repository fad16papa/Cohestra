"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { adminNavItems, isAdminNavItemActive, type AdminNavItem } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type AdminNavLinksProps = {
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
};

function ActivitiesNavSection({
  item,
  pathname,
  compact,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isParentActive =
    isAdminNavItemActive(pathname, item.href) ||
    item.children?.some((child) => isAdminNavItemActive(pathname, child.href));
  const [hoverOpen, setHoverOpen] = useState(false);
  const submenuOpen = isParentActive || hoverOpen;

  return (
    <div
      className="space-y-1"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        title={compact ? item.label : undefined}
        aria-current={
          isAdminNavItemActive(pathname, item.href) && pathname === item.href
            ? "page"
            : undefined
        }
        aria-expanded={submenuOpen}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact && "justify-center px-2 lg:justify-start lg:px-3",
          isParentActive
            ? "bg-primary/10 text-text-warm"
            : "text-foreground hover:bg-muted"
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className={cn(compact && "sr-only lg:not-sr-only lg:inline")}>{item.label}</span>
      </Link>

      <div
        className={cn(
          "overflow-hidden border-l border-border-warm pl-3 transition-[max-height,opacity] duration-200 ease-out",
          compact ? "ml-0 lg:ml-3" : "ml-3",
          submenuOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
          compact && !submenuOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="flex flex-col gap-1 pb-1">
          {item.children?.map((child) => {
            const isChildActive = isAdminNavItemActive(pathname, child.href);

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={isChildActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  compact && !submenuOpen && "sr-only",
                  compact && submenuOpen && "not-sr-only px-2 text-xs lg:px-3 lg:text-sm",
                  isChildActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-text-muted-warm hover:bg-muted hover:text-text-warm"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminNavLinks({
  compact = false,
  onNavigate,
  className,
}: AdminNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn("flex flex-col gap-1", className)}
    >
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        const hasChildren = Boolean(item.children?.length);

        if (hasChildren) {
          return (
            <ActivitiesNavSection
              key={item.href}
              item={item}
              pathname={pathname}
              compact={compact}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            aria-current={isAdminNavItemActive(pathname, item.href) ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact && "justify-center px-2 lg:justify-start lg:px-3",
          isAdminNavItemActive(pathname, item.href)
            ? "bg-primary/10 text-text-warm shadow-sm shadow-primary/5 ring-1 ring-primary/10"
            : "text-foreground hover:bg-muted/80"
        )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className={cn(compact && "sr-only lg:not-sr-only lg:inline")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
