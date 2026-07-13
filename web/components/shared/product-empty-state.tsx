import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

export function ProductEmptyState({
  icon: Icon,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: ProductEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed border-border-warm bg-card/80 px-6 py-12 text-center backdrop-blur-sm sm:px-10",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-accent/10 blur-2xl"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
          <Icon className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 text-section text-text-warm">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }))}>
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
