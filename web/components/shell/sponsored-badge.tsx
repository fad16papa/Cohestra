"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type SponsoredBadgeProps = {
  className?: string;
};

export function SponsoredBadge({ className }: SponsoredBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold",
        className
      )}
      aria-label="Sponsored complimentary plan"
    >
      <Sparkles className="size-3" aria-hidden />
      Sponsored
    </span>
  );
}
