import type { RegistrationExperienceStyle } from "@/lib/registration-experience";
import { cn } from "@/lib/utils";

/** Style dimension for Modern Centered shell only (modern vs minimal). */
export type ModernCenteredSurfaceStyle = "modern" | "minimal";

export function normalizeModernCenteredStyle(
  style: RegistrationExperienceStyle
): ModernCenteredSurfaceStyle {
  return style === "minimal" ? "minimal" : "modern";
}

type ModernCenteredStyleTokens = {
  page: string;
  activityBand: string;
  heroImage: string;
  heroNoImageBand: string;
  communityLabel: string;
  title: string;
  metadata: string;
  capacity: string;
  sectionDivider: string;
  formSurface: string;
  formHeading: string;
};

export function modernCenteredStyleTokens(
  style: ModernCenteredSurfaceStyle
): ModernCenteredStyleTokens {
  if (style === "minimal") {
    return {
      page: "gap-7 sm:gap-8",
      activityBand: "mx-auto w-full min-w-0 max-w-[680px] space-y-4 text-center",
      heroImage:
        "max-h-[min(32vh,260px)] w-full overflow-hidden rounded-lg border border-border-warm/70 bg-muted/20 sm:max-h-[280px]",
      heroNoImageBand:
        "rounded-lg border border-border-warm/60 bg-surface-warm/90 px-4 py-6 sm:px-6",
      communityLabel:
        "text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary/90",
      title:
        "text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-text-warm sm:text-[1.75rem]",
      metadata: "text-sm text-text-muted-warm",
      capacity: "justify-center",
      sectionDivider: "mx-auto h-px w-full max-w-[520px] bg-border-warm/80",
      formSurface: "mx-auto w-full min-w-0 max-w-[520px] space-y-5 pt-1",
      formHeading: "sr-only",
    };
  }

  return {
    page: "gap-8 sm:gap-9",
    activityBand: "mx-auto w-full min-w-0 max-w-[680px] space-y-5 text-center",
    heroImage:
      "max-h-[min(34vh,280px)] w-full overflow-hidden rounded-2xl border border-border-warm bg-muted/30 shadow-sm sm:max-h-[300px]",
    heroNoImageBand:
      "rounded-2xl border border-border-warm/80 bg-gradient-to-b from-card/90 to-surface-warm/80 px-5 py-7 shadow-sm sm:px-7 sm:py-8",
    communityLabel:
      "text-xs font-semibold uppercase tracking-[0.12em] text-primary",
    title:
      "text-balance text-[1.625rem] font-semibold leading-[1.12] tracking-tight text-text-warm sm:text-3xl",
    metadata: "text-sm text-text-warm/90",
    capacity: "justify-center",
    sectionDivider: "mx-auto h-px w-full max-w-[560px] bg-border-warm",
    formSurface:
      "mx-auto w-full min-w-0 max-w-[520px] space-y-5 rounded-2xl border border-border-warm/90 bg-card/70 px-4 py-5 shadow-sm backdrop-blur-[2px] sm:px-6 sm:py-6",
    formHeading:
      "text-center text-sm font-medium text-text-muted-warm",
  };
}

export function modernCenteredFormFieldClass(
  style: ModernCenteredSurfaceStyle | null | undefined
): string | undefined {
  if (!style) {
    return undefined;
  }

  return cn(
    "min-h-[3.25rem] border-border-warm/90 bg-background text-base shadow-none",
    style === "modern" && "focus-visible:ring-ring/40",
    style === "minimal" && "border-border-warm/70 bg-card/50"
  );
}

export function modernCenteredSubmitButtonClass(
  style: ModernCenteredSurfaceStyle | null | undefined
): string | undefined {
  if (!style) {
    return undefined;
  }

  return cn(
    "min-h-14 w-full text-base font-semibold tracking-tight",
    style === "modern" && "shadow-sm",
    style === "minimal" && "shadow-none"
  );
}
