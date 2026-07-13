import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, Quote, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { previewLayoutClass, type SitePreviewLayoutMode } from "@/lib/site-preview-layout";
import { cn } from "@/lib/utils";

/** Shared glass card surface for marketing sections. */
export function marketingSurfaceClass(extra?: string) {
  return cn(
    "rounded-2xl border border-border-warm/60 bg-gradient-to-b from-card/95 to-card/65 shadow-sm backdrop-blur-md",
    "motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-500",
    "hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.06]",
    extra
  );
}

export function marketingIconButtonClass(extra?: string) {
  return cn(
    buttonVariants({ variant: "outline", size: "icon-sm" }),
    "size-9 rounded-full border-border-warm/70 bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background",
    extra
  );
}
export function marketingCtaClass(
  variant: "default" | "outline" = "default",
  tone: "default" | "on-dark" = "default"
) {
  return cn(
    buttonVariants({ variant, size: "lg" }),
    "h-11 rounded-full px-6 text-sm font-semibold sm:h-12 sm:px-7",
    variant === "default" &&
      "shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary hover:shadow-xl hover:shadow-primary/25 motion-safe:transition-all",
    variant === "outline" &&
      tone === "default" &&
      "border-border-warm/80 bg-background/60 backdrop-blur-sm hover:bg-background/90",
    variant === "outline" &&
      tone === "on-dark" &&
      "border-white/45 bg-white/10 text-white backdrop-blur-sm hover:border-white/60 hover:bg-white/20"
  );
}

export function MarketingEyebrow({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-primary/15 bg-gradient-to-r from-primary/[0.08] to-accent/[0.06] px-3.5 py-1.5 text-xs font-medium tracking-wide text-primary shadow-sm backdrop-blur-sm",
        className
      )}
      style={style}
    >
      <span
        aria-hidden
        className="marketing-eyebrow-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60 dark:via-white/10"
      />
      <Sparkles
        className="relative size-3.5 shrink-0 motion-safe:animate-marketing-glow-pulse"
        aria-hidden
      />
      <span className="relative truncate">{children}</span>
    </div>
  );
}

export function MarketingSectionHeader({
  title,
  description,
  align = "left",
  className,
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl space-y-3",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <h2 className="text-marketing-section text-balance text-text-warm">{title}</h2>
      {description ? (
        <p className="text-marketing-lead text-text-muted-warm">{description}</p>
      ) : null}
    </div>
  );
}

export function MarketingStepTile({
  index,
  title,
  description,
  className,
  style,
}: {
  index: number;
  title: string;
  description?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn(marketingSurfaceClass("relative p-5 sm:p-6"), className)} style={style}>
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15">
        {String(index + 1).padStart(2, "0")}
      </div>
      <h3 className="text-base font-semibold tracking-tight text-text-warm">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">{description}</p>
      ) : null}
    </div>
  );
}

export function MarketingStatTile({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn(marketingSurfaceClass("px-4 py-5 text-center sm:py-6"), className)}>
      <p className="bg-gradient-to-br from-text-warm to-text-muted-warm bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
        {value}
      </p>
      {label ? (
        <p className="mt-1.5 text-sm font-medium text-text-muted-warm">{label}</p>
      ) : null}
    </div>
  );
}

export function MarketingQuoteCard({
  quote,
  name,
  role,
  avatarUrl,
  className,
}: {
  quote: string;
  name?: string;
  role?: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <figure className={cn(marketingSurfaceClass("flex h-full flex-col p-5 sm:p-6"), className)}>
      <Quote className="size-8 text-primary/20" aria-hidden />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-text-warm sm:text-[0.9375rem]">
        “{quote}”
      </blockquote>
      {(name || role || avatarUrl) && (
        <figcaption className="mt-5 flex items-center gap-3 border-t border-border-warm/50 pt-4">
          {avatarUrl ? (
            <span className="relative size-10 overflow-hidden rounded-full bg-muted ring-2 ring-background">
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized={avatarUrl.includes("/api/")}
              />
            </span>
          ) : null}
          <div>
            {name ? <p className="text-sm font-semibold text-text-warm">{name}</p> : null}
            {role ? <p className="text-xs text-text-muted-warm">{role}</p> : null}
          </div>
        </figcaption>
      )}
    </figure>
  );
}

export function MarketingFaqItem({
  question,
  answer,
  className,
}: {
  question: string;
  answer?: string;
  className?: string;
}) {
  return (
    <details
      className={cn(
        marketingSurfaceClass("group w-full px-5 py-4 sm:px-6 sm:py-5"),
        "hover:-translate-y-0",
        className
      )}
    >
      <summary className="cursor-pointer list-none text-base font-semibold leading-snug text-text-warm marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-4">
          <span className="min-w-0 flex-1 pr-2">{question}</span>
          <ChevronDown
            className="mt-1 size-4 shrink-0 text-text-muted-warm transition group-open:rotate-180"
            aria-hidden
          />
        </span>
      </summary>
      {answer ? (
        <p className="mt-4 border-t border-border-warm/40 pt-4 text-sm leading-relaxed text-text-muted-warm sm:text-[0.9375rem]">
          {answer}
        </p>
      ) : null}
    </details>
  );
}

export function MarketingEmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        marketingSurfaceClass("px-6 py-10 text-center"),
        className
      )}
    >
      <p className="text-sm text-text-muted-warm sm:text-base">{message}</p>
    </div>
  );
}
export function MarketingFeatureTile({
  icon,
  title,
  description,
  index = 0,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        marketingSurfaceClass("group relative overflow-hidden p-5"),
        "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/[0.08]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
      />
      <div className="relative">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10 motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105">
          {icon}
        </div>
        <h3 className="text-[0.9375rem] font-semibold tracking-tight text-text-warm sm:text-base">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted-warm">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function MarketingCinematicHero({
  imageUrl,
  previewMode,
  children,
}: {
  imageUrl?: string | null;
  previewMode: SitePreviewLayoutMode;
  children: ReactNode;
}) {
  const hasImage = Boolean(imageUrl);

  return (
    <section
      className={cn(
        "relative isolate flex w-full items-center overflow-hidden",
        hasImage && "-mt-14 sm:-mt-16",
        previewLayoutClass(previewMode, {
          full: "min-h-[min(88vh,52rem)]",
          phone: "min-h-[24rem]",
          desktop: "min-h-[min(88vh,52rem)]",
        })
      )}
    >
      {hasImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
            decoding="async"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-transparent from-20% via-black/30 to-black/70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_55%,transparent_30%,rgba(0,0,0,0.25)_100%)]"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-accent/20"
          />
          <div
            aria-hidden
            className="motion-safe:animate-marketing-gradient-drift absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
          />
        </>
      )}

      <div
        className={previewLayoutClass(previewMode, {
          full: "relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24 lg:pt-32",
          phone: "relative z-10 flex w-full flex-col justify-center px-4 py-12 pt-20",
          desktop:
            "relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-10 pb-24 pt-32",
        })}
      >
        {children}
      </div>
    </section>
  );
}
