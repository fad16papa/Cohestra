import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlatformCardProps = {
  children: ReactNode;
  className?: string;
};

export function PlatformCard({ children, className }: PlatformCardProps) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[var(--plat-line)] bg-white/80 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
