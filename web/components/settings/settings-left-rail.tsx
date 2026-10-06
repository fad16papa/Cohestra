"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import {
  settingsSectionGroups,
  type SettingsSectionGroup,
} from "@/components/settings/settings-sections";
import { AdminNavLockMark } from "@/components/layouts/admin-nav-lock";
import { navItemAccessibleName } from "@/lib/admin-nav-entitlements";
import { cn } from "@/lib/utils";

export type SettingsNavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: SettingsSectionGroup;
  lockedPlan?: "Core" | "Pro" | null;
};

type SettingsLeftRailProps = {
  items: SettingsNavLinkItem[];
  activeHref: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  hideCollapseToggle?: boolean;
  className?: string;
};

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  lockedPlan,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  lockedPlan?: "Core" | "Pro" | null;
}) {
  const lockedName =
    lockedPlan != null
      ? navItemAccessibleName(label, { state: "locked", requiredPlan: lockedPlan })
      : undefined;

  return (
    <Link
      href={href}
      title={collapsed ? (lockedName ?? label) : lockedName}
      aria-label={lockedName}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm motion-press",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 font-medium text-text-warm"
          : "text-text-muted-warm hover:bg-muted/60 hover:text-text-warm",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {lockedPlan && !collapsed ? <AdminNavLockMark requiredPlan={lockedPlan} /> : null}
    </Link>
  );
}

export function SettingsLeftRail({
  items,
  activeHref,
  collapsed,
  onToggleCollapsed,
  hideCollapseToggle = false,
  className,
}: SettingsLeftRailProps) {
  return (
    <aside
      aria-label="Settings sections"
      className={cn(
        "flex shrink-0 flex-col border-border-warm/80 bg-card/50 motion-safe:transition-[width] motion-safe:duration-200",
        collapsed ? "w-14" : "w-56",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-warm/80 px-2 py-3">
        {!collapsed ? (
          <p className="px-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted-warm">
            Sections
          </p>
        ) : null}
        {!hideCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand section navigation" : "Collapse section navigation"}
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-text-muted-warm motion-press hover:bg-muted/60 hover:text-text-warm"
          >
            {collapsed ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-2" aria-label="Settings sections">
        {settingsSectionGroups.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id);
          if (groupItems.length === 0) {
            return null;
          }

          return (
            <div key={group.id} className="space-y-1">
              {!collapsed ? (
                <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
                  {group.label}
                </p>
              ) : null}
              {groupItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={activeHref === item.href}
                  collapsed={collapsed}
                  lockedPlan={item.lockedPlan}
                />
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
