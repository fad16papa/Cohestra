import {
  BarChart3,
  CalendarDays,
  Globe,
  LayoutDashboard,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react";

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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/website", label: "Website", icon: Globe },
  {
    href: "/activities",
    label: "Activities",
    icon: CalendarDays,
    children: [
      { href: "/activities", label: "All activities" },
      { href: "/activities/communities", label: "Communities" },
      { href: "/activities/categories", label: "Categories" },
    ],
  },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (href === "/activities") {
    return (
      pathname === "/activities" ||
      pathname.startsWith("/activities/new") ||
      /^\/activities\/[0-9a-f-]{36}$/i.test(pathname)
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminPageTitle(pathname: string): string {
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  return breadcrumbs[breadcrumbs.length - 1]?.label ?? "Admin";
}

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  if (pathname === "/dashboard") {
    return [{ label: "Dashboard" }];
  }

  if (pathname === "/dashboard/website") {
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "Website" }];
  }

  if (pathname === "/clients") {
    return [{ label: "Clients" }];
  }

  if (pathname.startsWith("/clients/")) {
    return [{ label: "Clients", href: "/clients" }, { label: "Profile" }];
  }

  if (pathname === "/campaigns") {
    return [{ label: "Campaigns" }];
  }

  if (pathname.startsWith("/campaigns/")) {
    return [{ label: "Campaigns", href: "/campaigns" }, { label: "Campaign" }];
  }

  if (pathname === "/reports") {
    return [{ label: "Reports" }];
  }

  if (pathname === "/settings") {
    return [{ label: "Settings" }];
  }

  if (pathname === "/activities/new") {
    return [
      { label: "Activities", href: "/activities" },
      { label: "New activity" },
    ];
  }

  if (/^\/activities\/[0-9a-f-]{36}$/i.test(pathname)) {
    return [{ label: "Activities", href: "/activities" }, { label: "Activity" }];
  }

  if (pathname === "/activities/communities") {
    return [
      { label: "Activities", href: "/activities" },
      { label: "Communities" },
    ];
  }

  if (pathname.startsWith("/activities/communities/")) {
    return [
      { label: "Activities", href: "/activities" },
      { label: "Communities", href: "/activities/communities" },
      { label: "Community" },
    ];
  }

  if (pathname === "/activities/categories") {
    return [
      { label: "Activities", href: "/activities" },
      { label: "Categories" },
    ];
  }

  if (pathname === "/activities") {
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
