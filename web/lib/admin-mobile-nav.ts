import { CalendarDays, LayoutDashboard, ListTodo, Menu, Users, type LucideIcon } from "lucide-react";

import {
  ACTIVITIES_PATH,
  AI_PATH,
  ANALYTICS_PATH,
  CAMPAIGNS_PATH,
  CLIENTS_PATH,
  DASHBOARD_PATH,
  FOLLOW_UP_PATH,
  SETTINGS_PATH,
  WEBSITE_PATH,
  isAiPath,
  isAnalyticsPath,
  isFollowUpPath,
  isPathOrDescendant,
} from "@/lib/admin-canonical-routes";
import { adminNavItems, type AdminNavItem } from "@/lib/admin-nav";

export type MobileTabItem = {
  key: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  opensMenu?: boolean;
};

const MORE_SHEET_HREFS = new Set([
  ANALYTICS_PATH,
  AI_PATH,
  WEBSITE_PATH,
  CAMPAIGNS_PATH,
]);

export function isWebsitePath(pathname: string): boolean {
  return isPathOrDescendant(pathname, WEBSITE_PATH);
}

export function isMoreDestinationPath(pathname: string): boolean {
  return (
    isWebsitePath(pathname) ||
    isAnalyticsPath(pathname) ||
    isAiPath(pathname) ||
    isPathOrDescendant(pathname, CAMPAIGNS_PATH) ||
    isPathOrDescendant(pathname, SETTINGS_PATH)
  );
}

export const mobileTabItems: MobileTabItem[] = [
  {
    key: "home",
    label: "Home",
    href: DASHBOARD_PATH,
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === DASHBOARD_PATH,
  },
  {
    key: "clients",
    label: "Clients",
    href: CLIENTS_PATH,
    icon: Users,
    isActive: (pathname) => isPathOrDescendant(pathname, CLIENTS_PATH),
  },
  {
    key: "activities",
    label: "Activities",
    href: ACTIVITIES_PATH,
    icon: CalendarDays,
    isActive: (pathname) => isPathOrDescendant(pathname, ACTIVITIES_PATH),
  },
  {
    key: "follow-up",
    label: "Follow-up",
    href: FOLLOW_UP_PATH,
    icon: ListTodo,
    isActive: isFollowUpPath,
  },
  {
    key: "more",
    label: "More",
    icon: Menu,
    isActive: isMoreDestinationPath,
    opensMenu: true,
  },
];

export function moreSheetNavItems(): AdminNavItem[] {
  return adminNavItems.filter((item) => MORE_SHEET_HREFS.has(item.href));
}
