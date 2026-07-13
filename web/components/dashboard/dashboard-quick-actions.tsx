import Link from "next/link";
import { ArrowUpRight, FileBarChart, MailPlus, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/clients",
    label: "Browse clients",
    description: "Review leads and update follow-up status",
    icon: UserPlus,
    accent: "from-status-new/15 to-status-new/5",
  },
  {
    href: "/campaigns/new",
    label: "New campaign",
    description: "Compose and send to a consented segment",
    icon: MailPlus,
    accent: "from-primary/20 to-primary/5",
  },
  {
    href: "/reports",
    label: "View reports",
    description: "Export registrations for the month",
    icon: FileBarChart,
    accent: "from-status-contacted/15 to-status-contacted/5",
  },
] as const;

export function DashboardQuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-border-warm bg-card/80 p-4 transition-all",
              "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
                action.accent
              )}
            />
            <div className="relative flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <ArrowUpRight
                className="size-4 text-text-muted-warm transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </div>
            <p className="relative mt-4 font-medium text-text-warm">{action.label}</p>
            <p className="relative mt-1 text-sm text-text-muted-warm">
              {action.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
