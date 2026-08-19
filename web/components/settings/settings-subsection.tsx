import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsSubsectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** When true, omits the title block (parent card owns the heading). */
  embedded?: boolean;
};

export function SettingsSubsection({
  title,
  description,
  children,
  className,
  embedded = false,
}: SettingsSubsectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {!embedded ? (
        <div>
          <h3 className="text-sm font-semibold text-text-warm">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-text-muted-warm">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsSubsectionDivider() {
  return <div className="border-t border-border-warm/80" role="separator" />;
}
