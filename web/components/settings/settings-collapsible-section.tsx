"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsCollapsibleSectionProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function SettingsCollapsibleSection({
  id,
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: SettingsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card
      id={id}
      className={cn(
        "overflow-hidden border-border-warm/80 bg-card/80 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id ? `${id}-panel` : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5 sm:py-5",
          "transition-colors hover:bg-muted/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block font-heading text-base font-semibold leading-snug text-text-warm">
            {title}
          </span>
          {description ? (
            <CardDescription className="text-sm leading-relaxed text-text-muted-warm">
              {description}
            </CardDescription>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-5 shrink-0 text-text-muted-warm transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      <div
        id={id ? `${id}-panel` : undefined}
        hidden={!open}
        className="border-t border-border-warm/80 px-4 pb-5 pt-4 sm:px-5 sm:pb-6"
      >
        <div className="space-y-8">{children}</div>
      </div>
    </Card>
  );
}
