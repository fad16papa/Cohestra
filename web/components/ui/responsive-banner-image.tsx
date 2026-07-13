"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ResponsiveBannerVariant = "hero" | "card" | "preview" | "registration";

const variantMaxHeight: Record<ResponsiveBannerVariant, string> = {
  hero: "max-h-[min(32rem,70vh)]",
  card: "max-h-44 sm:max-h-48",
  preview: "max-h-64",
  registration: "max-h-[min(24rem,50vh)]",
};

type ResponsiveBannerImageProps = {
  src: string;
  alt?: string;
  variant?: ResponsiveBannerVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  onError?: () => void;
  overlay?: ReactNode;
};

/**
 * Banner image that keeps the uploaded asset's natural aspect ratio.
 * Width fills the container; height is capped so tall uploads don't dominate the page.
 */
export function ResponsiveBannerImage({
  src,
  alt = "",
  variant = "preview",
  className,
  imageClassName,
  priority = false,
  onError,
  overlay,
}: ResponsiveBannerImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "mx-auto block h-auto w-full object-contain",
          variantMaxHeight[variant],
          imageClassName
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
      {overlay}
    </div>
  );
}
