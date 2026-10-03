import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          typeof eyebrow === "string" ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-text-muted-warm">
              {eyebrow}
            </p>
          ) : (
            <div className="mb-1">{eyebrow}</div>
          )
        ) : null}
        <h1 className="break-words text-display-sm text-text-warm">{title}</h1>
        {description ? (
          typeof description === "string" ? (
            <p className="mt-1 max-w-2xl text-sm text-text-muted-warm">{description}</p>
          ) : (
            <div className="mt-1 max-w-2xl space-y-1 text-sm text-text-muted-warm">
              {description}
            </div>
          )
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:items-center [&_a]:justify-center [&_a]:px-4 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:px-4 [&_select]:min-h-11 [&_select]:min-w-11">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
