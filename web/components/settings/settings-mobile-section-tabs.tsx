"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type SettingsMobileSectionTabsProps = {
  items: Array<{ href: string; label: string }>;
  activeHref: string | null;
};

export function SettingsMobileSectionTabs({
  items,
  activeHref,
}: SettingsMobileSectionTabsProps) {
  return (
    <nav aria-label="Settings sections" className="lg:hidden">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium motion-local",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border-warm bg-card text-text-muted-warm hover:text-text-warm"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
