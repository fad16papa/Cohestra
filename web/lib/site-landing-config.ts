import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/brand-assets";

export type SiteLandingConfig = {
  siteName: string;
  tagline: string;
  description: string;
  heroEyebrow: string;
  operatorCtaLabel: string;
  poweredByLabel: string;
};

export function getSiteLandingConfig(): SiteLandingConfig {
  return {
    siteName: process.env.NEXT_PUBLIC_LANDING_SITE_NAME?.trim() || PLATFORM_NAME,
    tagline:
      process.env.NEXT_PUBLIC_LANDING_TAGLINE?.trim() || PLATFORM_TAGLINE,
    description:
      process.env.NEXT_PUBLIC_LANDING_DESCRIPTION?.trim() ||
      "Discover events, register in seconds, and stay connected with the communities you care about.",
    heroEyebrow:
      process.env.NEXT_PUBLIC_LANDING_EYEBROW?.trim() || "Community events platform",
    operatorCtaLabel:
      process.env.NEXT_PUBLIC_LANDING_OPERATOR_CTA?.trim() || "Operator sign in",
    poweredByLabel: PLATFORM_NAME,
  };
}
