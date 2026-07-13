"use client";

import type { ReactNode } from "react";

import { MarketingSectionHeader } from "@/components/marketing/marketing-primitives";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { previewLayoutClass, useSitePreviewLayout } from "@/lib/site-preview-layout";
import { cn } from "@/lib/utils";
import type { SectionVariant } from "@/lib/site-sections/limits";

type SectionShellProps = {
  variant?: SectionVariant;
  className?: string;
  children: ReactNode;
};

export function SectionShell({ variant = "default", className, children }: SectionShellProps) {
  const previewMode = useSitePreviewLayout();

  return (
    <MarketingReveal
      as="section"
      className={cn(
        "marketing-scroll-rise mt-20 scroll-mt-28 sm:mt-24",
        variant === "accent" &&
          previewLayoutClass(previewMode, {
            full: "overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-b from-primary/[0.06] to-primary/[0.02] px-6 py-10 sm:px-10 sm:py-12",
            phone: "rounded-2xl border border-primary/15 bg-primary/[0.05] px-5 py-8",
            desktop:
              "overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-b from-primary/[0.06] to-primary/[0.02] px-10 py-12",
          }),
        variant === "muted" &&
          previewLayoutClass(previewMode, {
            full: "overflow-hidden rounded-[1.75rem] border border-border-warm/60 bg-gradient-to-b from-card/80 to-card/40 px-6 py-10 backdrop-blur-md sm:px-10 sm:py-12",
            phone:
              "rounded-2xl border border-border-warm/60 bg-card/60 px-5 py-8 backdrop-blur-sm",
            desktop:
              "overflow-hidden rounded-[1.75rem] border border-border-warm/60 bg-gradient-to-b from-card/80 to-card/40 px-10 py-12 backdrop-blur-md",
          }),
        className
      )}
    >
      {children}
    </MarketingReveal>
  );
}

export function SectionTitle({
  children,
  description,
  align = "left",
  className,
}: {
  children: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <MarketingSectionHeader
      title={typeof children === "string" ? children : String(children)}
      description={description}
      align={align}
      className={cn("mb-8 sm:mb-10", className)}
    />
  );
}