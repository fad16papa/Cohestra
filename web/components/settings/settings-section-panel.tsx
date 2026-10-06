"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsSectionPanelProps = {
  children: ReactNode;
  labelledBy?: string;
};

export function SettingsSectionPanel({ children, labelledBy }: SettingsSectionPanelProps) {
  return (
    <article
      className="w-full space-y-6"
      aria-labelledby={labelledBy}
    >
      <div className={cn("space-y-8")}>{children}</div>
    </article>
  );
}
