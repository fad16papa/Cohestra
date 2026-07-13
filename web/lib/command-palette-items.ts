import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  MailPlus,
  Megaphone,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { adminNavItems } from "@/lib/admin-nav";

export type CommandPaletteItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string;
  icon: LucideIcon;
};

const quickActions: CommandPaletteItem[] = [
  {
    id: "new-campaign",
    label: "Compose new campaign",
    href: "/campaigns/new",
    group: "Quick actions",
    keywords: "email send outreach",
    icon: MailPlus,
  },
  {
    id: "new-activity",
    label: "Create activity",
    href: "/activities/new",
    group: "Quick actions",
    keywords: "publish form qr",
    icon: Plus,
  },
];

const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/activities": CalendarDays,
  "/clients": Users,
  "/campaigns": Megaphone,
  "/reports": BarChart3,
};

function navItems(): CommandPaletteItem[] {
  const items: CommandPaletteItem[] = [];

  for (const item of adminNavItems) {
    items.push({
      id: item.href,
      label: item.label,
      href: item.href,
      group: "Navigate",
      icon: item.icon,
    });

    for (const child of item.children ?? []) {
      items.push({
        id: child.href,
        label: child.label,
        href: child.href,
        group: "Navigate",
        keywords: item.label,
        icon: iconByHref[item.href] ?? item.icon,
      });
    }
  }

  return items;
}

export const commandPaletteItems: CommandPaletteItem[] = [
  ...quickActions,
  ...navItems(),
];

export function filterCommandPaletteItems(
  query: string,
  items: CommandPaletteItem[] = commandPaletteItems
): CommandPaletteItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const haystack = `${item.label} ${item.group} ${item.keywords ?? ""}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
