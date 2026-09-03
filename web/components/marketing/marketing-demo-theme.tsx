"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MarketingDemoTheme({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-demo-theme
      className={cn(
        "marketing-demo-mount flex h-full min-h-0 flex-col overflow-hidden bg-paper-warm text-ink",
        className
      )}
    >
      {children}
    </div>
  );
}
