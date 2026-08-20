"use client";

import type { ReactNode } from "react";

import type { SettingsSectionMeta } from "@/components/settings/settings-sections";
import { cn } from "@/lib/utils";

type SettingsSectionPanelProps = {
  section: SettingsSectionMeta;
  children: ReactNode;
};

export function SettingsSectionPanel({ section, children }: SettingsSectionPanelProps) {
  return (
    <article className="w-full space-y-6">
      <header className="space-y-2 border-b border-border-warm/80 pb-5">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-text-warm sm:text-2xl">
          {section.label}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted-warm">
          {section.description}
        </p>
      </header>
      <div className={cn("space-y-8")}>{children}</div>
    </article>
  );
}
