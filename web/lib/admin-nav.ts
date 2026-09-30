import { BarChart3, CalendarDays, Globe, LayoutDashboard, ListTodo, Megaphone, Sparkles, Users, type LucideIcon } from "lucide-react";

import {
  ACTIVITIES_PATH,
  AI_PATH,
  ANALYTICS_PATH,
  CAMPAIGNS_PATH,
  CLIENTS_PATH,
  DASHBOARD_PATH,
  FOLLOW_UP_PATH,
  WEBSITE_PATH,
  isAiPath,
  isAnalyticsPath,
  isFollowUpPath,
} from "@/lib/admin-canonical-routes";

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

export type AdminNavChildItem = {
  href: string;
  label: string;
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: AdminNavChildItem[];
};

export const adminNavItems: AdminNavItem[] = [
  { href: DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
  { href: CLIENTS_PATH, label: "Clients", icon: Users },
  {
    href: ACTIVITIES_PATH,
    label: "Activities",
    icon: CalendarDays,
    children: [
      { href: ACTIVITIES_PATH, label: "All activities" },
      { href: "/activities/communities", label: "Communities" },
      { href: "/activities/categories", label: "Categories" },
    ],
  },
  { href: FOLLOW_UP_PATH, label: "Follow-up", icon: ListTodo },
  { href: ANALYTICS_PATH, label: "Analytics", icon: BarChart3 },
  { href: AI_PATH, label: "Cohestra AI", icon: Sparkles },
  { href: WEBSITE_PATH, label: "Website", icon: Globe },
  { href: CAMPAIGNS_PATH, label: "Campaigns", icon: Megaphone },
];

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === DASHBOARD_PATH) {
    return pathname === DASHBOARD_PATH;
  }

  if (href === ACTIVITIES_PATH) {
    return (
      pathname === ACTIVITIES_PATH ||
      pathname.startsWith("/activities/new") ||
      /^\/activities\/[0-9a-f-]{36}$/i.test(pathname)
    );
  }

  if (href === ANALYTICS_PATH) {
    return isAnalyticsPath(pathname);
  }

  if (href === AI_PATH) {
    return isAiPath(pathname);
  }

  if (href === FOLLOW_UP_PATH) {
    return isFollowUpPath(pathname);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminPageTitle(pathname: string): string {
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  return breadcrumbs[breadcrumbs.length - 1]?.label ?? "Admin";
}

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  if (pathname === DASHBOARD_PATH) {
    return [{ label: "Dashboard" }];
  }

  if (pathname === WEBSITE_PATH) {
    return [{ label: "Dashboard", href: DASHBOARD_PATH }, { label: "Website Studio" }];
  }

  if (pathname === CLIENTS_PATH) {
    return [{ label: "Clients" }];
  }

  if (pathname.startsWith(`${CLIENTS_PATH}/`)) {
    return [{ label: "Clients", href: CLIENTS_PATH }, { label: "Profile" }];
  }

  if (pathname === CAMPAIGNS_PATH) {
    return [{ label: "Campaigns" }];
  }

  if (pathname.startsWith(`${CAMPAIGNS_PATH}/`)) {
    return [{ label: "Campaigns", href: CAMPAIGNS_PATH }, { label: "Campaign" }];
  }

  if (isAnalyticsPath(pathname)) {
    return [{ label: "Analytics" }];
  }

  if (isFollowUpPath(pathname)) {
    return [{ label: "Follow-up" }];
  }

  if (isAiPath(pathname)) {
    return [{ label: "Cohestra AI" }];
  }

  if (pathname === "/settings" || pathname === "/settings/profile") {
    return [{ label: "Settings" }];
  }

  if (pathname === "/settings/billing") {
    return [{ label: "Settings", href: "/settings/profile" }, { label: "Billing" }];
  }

  if (pathname === "/settings/team") {
    return [{ label: "Settings", href: "/settings/profile" }, { label: "Team" }];
  }

  if (pathname === "/activities/new") {
    return [
      { label: "Activities", href: ACTIVITIES_PATH },
      { label: "New activity" },
    ];
  }

  if (/^\/activities\/[0-9a-f-]{36}$/i.test(pathname)) {
    return [{ label: "Activities", href: ACTIVITIES_PATH }, { label: "Activity" }];
  }

  if (pathname === "/activities/communities") {
    return [
      { label: "Activities", href: ACTIVITIES_PATH },
      { label: "Communities" },
    ];
  }

  if (pathname.startsWith("/activities/communities/")) {
    return [
      { label: "Activities", href: ACTIVITIES_PATH },
      { label: "Communities", href: "/activities/communities" },
      { label: "Community" },
    ];
  }

  if (pathname === "/activities/categories") {
    return [
      { label: "Activities", href: ACTIVITIES_PATH },
      { label: "Categories" },
    ];
  }

  if (pathname === ACTIVITIES_PATH) {
    return [{ label: "Activities" }];
  }

  const match = adminNavItems.find(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      item.children?.some((child) => isAdminNavItemActive(pathname, child.href))
  );

  return [{ label: match?.label ?? "Admin" }];
}
