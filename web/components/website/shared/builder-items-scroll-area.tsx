import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BuilderItemsScrollAreaProps = {
  children: ReactNode;
  className?: string;
};

/** Keeps multi-item section editors compact with an internal scroll region. */
export function BuilderItemsScrollArea({
  children,
  className,
}: BuilderItemsScrollAreaProps) {
  return (
    <div
      className={cn(
        "max-h-[min(22rem,45vh)] overflow-y-auto overscroll-y-contain rounded-lg border border-border-warm/70 bg-muted/10 p-2",
        "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-warm/80",
        className
      )}
    >
      <div className="space-y-3">{children}</div>
    </div>
  );
}
