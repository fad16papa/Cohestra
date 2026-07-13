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
    siteName:
      process.env.NEXT_PUBLIC_LANDING_SITE_NAME?.trim() || "The Social Collective",
    tagline:
      process.env.NEXT_PUBLIC_LANDING_TAGLINE?.trim() ||
      "Community activities. Meaningful connections.",
    description:
      process.env.NEXT_PUBLIC_LANDING_DESCRIPTION?.trim() ||
      "Join our events, register in seconds, and stay connected with the communities you care about.",
    heroEyebrow:
      process.env.NEXT_PUBLIC_LANDING_EYEBROW?.trim() || "Singapore · Community events",
    operatorCtaLabel:
      process.env.NEXT_PUBLIC_LANDING_OPERATOR_CTA?.trim() || "Operator sign in",
    poweredByLabel: "Powered by CreativoRare",
  };
}
