"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  settingsSectionGroups,
  type SettingsSectionId,
  type SettingsSectionMeta,
} from "@/components/settings/settings-sections";
import { cn } from "@/lib/utils";

type SettingsLeftRailProps = {
  sections: SettingsSectionMeta[];
  activeId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  showBillingLink: boolean;
  showAdminLinks?: boolean;
  hideCollapseToggle?: boolean;
  className?: string;
};

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 font-medium text-text-warm"
          : "text-text-muted-warm hover:bg-muted/60 hover:text-text-warm",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

export function SettingsLeftRail({
  sections,
  activeId,
  onSelect,
  collapsed,
  onToggleCollapsed,
  showBillingLink,
  showAdminLinks = true,
  hideCollapseToggle = false,
  className,
}: SettingsLeftRailProps) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-border-warm/80 bg-card/50 transition-[width] duration-200",
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
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-text-muted-warm hover:bg-muted/60 hover:text-text-warm"
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
          const groupSections = sections.filter((section) => section.group === group.id);
          if (groupSections.length === 0) {
            return null;
          }

          return (
            <div key={group.id} className="space-y-1">
              {!collapsed ? (
                <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
                  {group.label}
                </p>
              ) : null}
              {groupSections.map((section) => (
                <NavButton
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  active={activeId === section.id}
                  collapsed={collapsed}
                  onClick={() => onSelect(section.id)}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {showAdminLinks ? (
        <div className="space-y-1 border-t border-border-warm/80 p-2">
        {!collapsed ? (
          <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
            Admin pages
          </p>
        ) : null}
        <Link
          href="/settings/team"
          title={collapsed ? "Team" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-muted-warm transition-colors hover:bg-muted/60 hover:text-text-warm",
            collapsed && "justify-center px-2"
          )}
        >
          <Users className="size-4 shrink-0" aria-hidden />
          {!collapsed ? <span>Team</span> : null}
        </Link>
        {showBillingLink ? (
          <Link
            href="/settings/billing"
            title={collapsed ? "Billing" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-muted-warm transition-colors hover:bg-muted/60 hover:text-text-warm",
              collapsed && "justify-center px-2"
            )}
          >
            <CreditCard className="size-4 shrink-0" aria-hidden />
            {!collapsed ? <span>Billing</span> : null}
          </Link>
        ) : null}
        </div>
      ) : null}
    </aside>
  );
}
