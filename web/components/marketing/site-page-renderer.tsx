"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import {
  ArrowRight,
  CalendarDays,
  LucideIcon,
  MapPin,
  QrCode,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingEyebrow,
  MarketingEmptyState,
  MarketingFeatureTile,
  MarketingCinematicHero,
  MarketingSectionHeader,
  MarketingStepTile,
  marketingSurfaceClass,
  marketingCtaClass,
} from "@/components/marketing/marketing-primitives";
import {
  marketingHeroEnterClass,
  marketingHeroEnterStyle,
  MarketingReveal,
  marketingRevealDelay,
} from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import { SiteMarketingBackground } from "@/components/marketing/site-marketing-background";
import { CarouselPublicSection } from "@/components/marketing/sections/carousel-section";
import { CtaBandPublicSection } from "@/components/marketing/sections/cta-band-section";
import { FaqPublicSection } from "@/components/marketing/sections/faq-section";
import { StatsPublicSection } from "@/components/marketing/sections/stats-section";
import { TestimonialsPublicSection } from "@/components/marketing/sections/testimonials-section";
import { SitePreviewBanner } from "@/components/marketing/site-preview-banner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buildBrandAccentStyle } from "@/lib/brand-accent";
import {
  getEnabledSections,
  isUpcomingActivitiesSectionEnabled,
  type PublicHomepageActivity,
  type PublicSitePayload,
  type SiteSection,
} from "@/lib/public-site-api";
import { readPublicCta } from "@/lib/site-cta-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import {
  previewLayoutClass,
  useSitePreviewLayout,
  type SitePreviewLayoutMode,
} from "@/lib/site-preview-layout";
import { PLATFORM_LOGO_PATH } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

const HIGHLIGHT_ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  "qr-code": QrCode,
  users: Users,
};

type SitePageRendererProps = {
  site: PublicSitePayload;
  isPreview?: boolean;
  showPreviewBanner?: boolean;
};

type CtaProps = {
  label: string;
  target: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  tone?: "default" | "on-dark";
};

function resolveCtaHref(target: string): string {
  if (target === "scroll-upcoming") {
    return "#upcoming-activities";
  }

  if (target.startsWith("activity:")) {
    const slug = target.slice("activity:".length).trim();
    return slug ? `/register/${slug}` : "/";
  }

  if (target.startsWith("/")) {
    return target;
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }

  return "/";
}

function SiteCta({
  label,
  target,
  variant = "default",
  tone = "default",
}: CtaProps) {
  const href = resolveCtaHref(target);
  const isScrollTarget = target === "scroll-upcoming";
  const isExternal = href.startsWith("http");
  const className = marketingCtaClass(
    variant === "outline" ? "outline" : "default",
    tone
  );

  if (isScrollTarget) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        {variant === "default" ? <ArrowRight className="size-4" aria-hidden /> : null}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      {variant === "default" ? <ArrowRight className="size-4" aria-hidden /> : null}
    </Link>
  );
}

function HeroSection({
  section,
  siteName,
  previewMode,
}: {
  section: SiteSection;
  siteName: string;
  previewMode: SitePreviewLayoutMode;
}) {
  const eyebrow = typeof section.props.eyebrow === "string" ? section.props.eyebrow : "";
  const headline = typeof section.props.headline === "string" ? section.props.headline : siteName;
  const description =
    typeof section.props.description === "string" ? section.props.description : "";
  const primaryCta = readPublicCta(section.props, "primaryCta");
  const secondaryCta = readPublicCta(section.props, "secondaryCta");
  const heroImageAssetId =
    typeof section.props.heroImageAssetId === "string"
      ? section.props.heroImageAssetId.trim()
      : "";
  const heroImageUrl = heroImageAssetId
    ? resolveHeroImageUrl(`/api/v1/public/campaign-assets/${heroImageAssetId}`)
    : null;
  const onDark = Boolean(heroImageUrl);

  return (
    <MarketingCinematicHero imageUrl={heroImageUrl} previewMode={previewMode}>
      <div
        className={previewLayoutClass(previewMode, {
          full: "mx-auto max-w-4xl space-y-6 text-center sm:space-y-8",
          phone: "space-y-4 text-left",
          desktop: "mx-auto max-w-4xl space-y-8 text-center",
        })}
      >
        {eyebrow ? (
          <MarketingEyebrow
            className={cn(
              marketingHeroEnterClass(),
              onDark &&
                "border-white/25 bg-white/10 text-white shadow-lg shadow-black/20 backdrop-blur-md"
            )}
            style={marketingHeroEnterStyle(0)}
          >
            {eyebrow}
          </MarketingEyebrow>
        ) : null}
        <h1
          className={previewLayoutClass(previewMode, {
            full: cn(
              "text-balance font-bold tracking-tight",
              onDark
                ? "text-[clamp(2.25rem,5.5vw+0.75rem,4.75rem)] leading-[1.02] text-white drop-shadow-lg"
                : "text-marketing-hero text-text-warm",
              marketingHeroEnterClass()
            ),
            phone: cn(
              "text-[1.875rem] font-bold leading-[1.06] tracking-tight text-balance",
              onDark ? "text-white drop-shadow-md" : "text-text-warm",
              marketingHeroEnterClass()
            ),
            desktop: cn(
              "text-balance font-bold tracking-tight",
              onDark
                ? "text-[clamp(2.5rem,4vw+1rem,5rem)] leading-[1.02] text-white drop-shadow-lg"
                : "text-marketing-hero text-text-warm",
              marketingHeroEnterClass()
            ),
          })}
          style={marketingHeroEnterStyle(eyebrow ? 70 : 0)}
        >
          {headline}
        </h1>
        {description ? (
          <p
            className={previewLayoutClass(previewMode, {
              full: cn(
                "mx-auto max-w-2xl text-marketing-lead",
                onDark ? "text-white/90 drop-shadow-sm" : "text-text-muted-warm",
                marketingHeroEnterClass()
              ),
              phone: cn(
                "text-[1rem] leading-relaxed",
                onDark ? "text-white/85" : "text-text-muted-warm",
                marketingHeroEnterClass()
              ),
              desktop: cn(
                "mx-auto max-w-2xl text-marketing-lead",
                onDark ? "text-white/90 drop-shadow-sm" : "text-text-muted-warm",
                marketingHeroEnterClass()
              ),
            })}
            style={marketingHeroEnterStyle(eyebrow ? 130 : 60)}
          >
            {description}
          </p>
        ) : null}
        {(primaryCta || secondaryCta) && (
          <div
            className={previewLayoutClass(previewMode, {
              full: cn(
                "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4 [&_a]:w-full sm:[&_a]:w-auto",
                marketingHeroEnterClass()
              ),
              phone: cn("flex flex-col gap-2.5 [&_a]:w-full", marketingHeroEnterClass()),
              desktop: cn(
                "flex flex-wrap items-center justify-center gap-4 [&_a]:w-auto",
                marketingHeroEnterClass()
              ),
            })}
            style={marketingHeroEnterStyle(eyebrow ? 190 : 120)}
          >
            {primaryCta ? (
              <SiteCta label={primaryCta.label} target={primaryCta.target} tone={onDark ? "on-dark" : "default"} />
            ) : null}
            {secondaryCta ? (
              <SiteCta
                label={secondaryCta.label}
                target={secondaryCta.target}
                variant="outline"
                tone={onDark ? "on-dark" : "default"}
              />
            ) : null}
          </div>
        )}
        <p
          className={previewLayoutClass(previewMode, {
            full: cn(
              "mx-auto max-w-lg text-xs leading-relaxed sm:text-sm",
              onDark ? "text-white/75" : "text-text-muted-warm/90",
              marketingHeroEnterClass()
            ),
            phone: cn(
              "text-xs leading-relaxed",
              onDark ? "text-white/70" : "text-text-muted-warm",
              marketingHeroEnterClass()
            ),
            desktop: cn(
              "mx-auto max-w-lg text-sm",
              onDark ? "text-white/75" : "text-text-muted-warm/90",
              marketingHeroEnterClass()
            ),
          })}
          style={marketingHeroEnterStyle(eyebrow ? 240 : 170)}
        >
          Have an event link or QR code? Open it directly — no need to start here.
        </p>
      </div>
    </MarketingCinematicHero>
  );
}

function HighlightsSection({
  section,
  previewMode,
}: {
  section: SiteSection;
  previewMode: SitePreviewLayoutMode;
}) {
  const items = Array.isArray(section.props.items) ? section.props.items : [];

  return (
    <section
      className={previewLayoutClass(previewMode, {
        full: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        phone: "grid grid-cols-1 gap-3",
        desktop: "grid grid-cols-3 gap-4",
      })}
    >
      {items.map((item, index) => {
        if (typeof item !== "object" || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const title = typeof record.title === "string" ? record.title : "";
        const description = typeof record.description === "string" ? record.description : "";
        const iconKey = typeof record.icon === "string" ? record.icon : "calendar";
        const Icon = HIGHLIGHT_ICONS[iconKey] ?? CalendarDays;

        if (!title) {
          return null;
        }

        return (
          <MarketingReveal
            key={`${title}-${index}`}
            immediate
            delayMs={marketingRevealDelay(index, 40, 60)}
            className="marketing-scroll-rise"
          >
            <MarketingFeatureTile
              icon={<Icon className="size-5" aria-hidden />}
              title={title}
              description={description || undefined}
              index={index}
            />
          </MarketingReveal>
        );
      })}
    </section>
  );
}

function ActivityCard({
  activity,
  revealDelayMs = 0,
}: {
  activity: PublicHomepageActivity;
  revealDelayMs?: number;
}) {
  const heroUrl = resolveHeroImageUrl(activity.heroImageUrl);

  return (
    <MarketingReveal
      delayMs={revealDelayMs}
      className="marketing-scroll-rise h-full"
    >
      <Link
        href={`/register/${activity.slug}`}
        className={cn(
          marketingSurfaceClass("group relative flex h-full flex-col overflow-hidden p-0"),
          "motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-xl motion-safe:hover:shadow-primary/[0.1]"
        )}
      >
      {heroUrl ? (
        <div className="relative w-full overflow-hidden bg-muted/30">
          <ResponsiveBannerImage
            src={heroUrl}
            variant="card"
            imageClassName="transition duration-500 group-hover:scale-[1.02]"
            overlay={
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-primary shadow-sm backdrop-blur-sm">
                  {activity.communityLabel}
                </span>
              </>
            }
          />
        </div>
      ) : (
        <div className="border-b border-border-warm/50 px-5 pt-5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary">
            {activity.communityLabel}
          </p>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="text-base font-semibold tracking-tight text-text-warm transition group-hover:text-primary">
          {activity.name}
        </h3>
        {activity.schedule ? (
          <p className="flex items-start gap-2 text-sm text-text-muted-warm">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary/70" aria-hidden />
            <span>{activity.schedule}</span>
          </p>
        ) : null}
        {activity.location ? (
          <p className="flex items-start gap-2 text-sm text-text-muted-warm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary/70" aria-hidden />
            <span>{activity.location}</span>
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-primary sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          View event
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
    </MarketingReveal>
  );
}

function UpcomingActivitiesSection({
  section,
  activities,
  previewMode,
}: {
  section: SiteSection;
  activities: PublicHomepageActivity[];
  previewMode: SitePreviewLayoutMode;
}) {
  const title =
    typeof section.props.title === "string" ? section.props.title : "Upcoming activities";
  const emptyMessage =
    typeof section.props.emptyMessage === "string"
      ? section.props.emptyMessage
      : "New events coming soon.";

  return (
    <MarketingReveal
      as="section"
      id="upcoming-activities"
      className="marketing-scroll-rise mt-20 scroll-mt-28 sm:mt-24"
    >
      <MarketingSectionHeader title={title} className="mb-8 sm:mb-10" />
      {activities.length > 0 ? (
        <div
          className={previewLayoutClass(previewMode, {
            full: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            phone: "grid grid-cols-1 gap-3",
            desktop: "grid grid-cols-3 gap-4",
          })}
        >
          {activities.map((activity, index) => (
            <ActivityCard
              key={activity.slug}
              activity={activity}
              revealDelayMs={marketingRevealDelay(index, 80, 65)}
            />
          ))}
        </div>
      ) : (
        <MarketingEmptyState message={emptyMessage} />
      )}
    </MarketingReveal>
  );
}

function HowItWorksSection({
  section,
  previewMode,
}: {
  section: SiteSection;
  previewMode: SitePreviewLayoutMode;
}) {
  const title = typeof section.props.title === "string" ? section.props.title : "";
  const description =
    typeof section.props.description === "string" ? section.props.description : "";
  const steps = Array.isArray(section.props.steps) ? section.props.steps : [];

  return (
    <MarketingReveal
      as="section"
      className={previewLayoutClass(previewMode, {
        full: "marketing-scroll-rise relative mt-20 overflow-hidden rounded-[1.75rem] border border-border-warm/60 bg-gradient-to-b from-card/85 to-card/45 p-6 shadow-sm backdrop-blur-md sm:mt-24 sm:p-8 lg:p-10",
        phone: "marketing-scroll-rise relative mt-12 overflow-hidden rounded-2xl border border-border-warm/60 bg-card/70 p-5 shadow-sm backdrop-blur-sm",
        desktop:
          "marketing-scroll-rise relative mt-24 overflow-hidden rounded-[1.75rem] border border-border-warm/60 bg-gradient-to-b from-card/85 to-card/45 p-10 shadow-sm backdrop-blur-md",
      })}
    >
      <div
        aria-hidden
        className="motion-safe:animate-marketing-glow-pulse pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative space-y-8 sm:space-y-10">
        {(title || description) && (
          <MarketingSectionHeader
            title={title || "How it works"}
            description={description || undefined}
          />
        )}
        {steps.length > 0 ? (
          <div
            className={previewLayoutClass(previewMode, {
              full: "relative grid grid-cols-1 gap-4 sm:grid-cols-3",
              phone: "grid grid-cols-1 gap-3",
              desktop: "relative grid grid-cols-3 gap-4",
            })}
          >
            {steps.map((step, index) => {
              if (typeof step !== "object" || step === null) {
                return null;
              }

              const record = step as Record<string, unknown>;
              const stepTitle = typeof record.title === "string" ? record.title : "";
              const stepDescription =
                typeof record.description === "string" ? record.description : "";

              if (!stepTitle) {
                return null;
              }

              return (
                <MarketingStepTile
                  key={`${stepTitle}-${index}`}
                  index={index}
                  title={stepTitle}
                  description={stepDescription || undefined}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${120 + index * 80}ms` }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </MarketingReveal>
  );
}

function FooterSection({
  section,
  previewMode,
}: {
  section: SiteSection;
  previewMode: SitePreviewLayoutMode;
}) {
  const poweredByLabel =
    typeof section.props.poweredByLabel === "string"
      ? section.props.poweredByLabel
      : "Cohestra";

  return (
    <footer
      className={previewLayoutClass(previewMode, {
        full: "relative z-10 mt-8 border-t border-border-warm/60 bg-background/70 backdrop-blur-md",
        phone: "relative z-10 mt-6 border-t border-border-warm/60 bg-background/70 backdrop-blur-md",
        desktop:
          "relative z-10 mt-10 border-t border-border-warm/60 bg-background/70 backdrop-blur-md",
      })}
    >
      <div
        className={previewLayoutClass(previewMode, {
          full: "mx-auto flex max-w-7xl justify-center px-4 py-5 sm:px-6 lg:px-10",
          phone: "flex justify-center px-4 py-4",
          desktop: "mx-auto flex max-w-7xl justify-center px-10 py-5",
        })}
      >
        <p className="text-center text-xs text-muted-foreground sm:text-sm">
          {poweredByLabel}
          <span aria-hidden="true" className="px-2 text-border-warm">
            ·
          </span>
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

function renderSection(
  section: SiteSection,
  context: {
    siteName: string;
    upcomingActivities: PublicHomepageActivity[];
    showUpcoming: boolean;
    previewMode: SitePreviewLayoutMode;
  }
) {
  let node: ReactNode = null;

  switch (section.type.toLowerCase()) {
    case "hero":
      node = (
        <HeroSection
          section={section}
          siteName={context.siteName}
          previewMode={context.previewMode}
        />
      );
      break;
    case "highlights":
      node = <HighlightsSection section={section} previewMode={context.previewMode} />;
      break;
    case "upcomingactivities":
      node = context.showUpcoming ? (
        <UpcomingActivitiesSection
          section={section}
          activities={context.upcomingActivities}
          previewMode={context.previewMode}
        />
      ) : null;
      break;
    case "howitworks":
      node = <HowItWorksSection section={section} previewMode={context.previewMode} />;
      break;
    case "carousel":
      node = <CarouselPublicSection section={section} />;
      break;
    case "testimonials":
      node = <TestimonialsPublicSection section={section} />;
      break;
    case "faq":
      node = <FaqPublicSection section={section} />;
      break;
    case "stats":
      node = <StatsPublicSection section={section} />;
      break;
    case "ctaband":
      node = <CtaBandPublicSection section={section} />;
      break;
    case "footer":
      node = <FooterSection section={section} previewMode={context.previewMode} />;
      break;
    default:
      node = null;
  }

  if (!node) {
    return null;
  }

  return <div key={section.id}>{node}</div>;
}

export function SitePageRenderer({
  site,
  isPreview = false,
  showPreviewBanner,
}: SitePageRendererProps) {
  const previewMode = useSitePreviewLayout();
  const shouldShowPreviewBanner = showPreviewBanner ?? (isPreview && !previewMode);
  const { published, upcomingActivities } = site;
  const { status } = useAuth();
  const { resolvedTheme } = useTheme();

  const sections = useMemo(() => getEnabledSections(published), [published]);
  const showUpcoming = isUpcomingActivitiesSectionEnabled(published);
  const heroSection = sections.find((section) => section.type.toLowerCase() === "hero");
  const headerEyebrow =
    heroSection && typeof heroSection.props.eyebrow === "string"
      ? heroSection.props.eyebrow
      : "";

  const accentStyle = useMemo(
    () => buildBrandAccentStyle(published.accentColor, resolvedTheme === "dark"),
    [published.accentColor, resolvedTheme]
  );

  const siteLogoUrl = useMemo(() => {
    const assetId = published.logoAssetId?.trim();
    if (!assetId) {
      return PLATFORM_LOGO_PATH;
    }

    return (
      resolveHeroImageUrl(`/api/v1/public/campaign-assets/${assetId}`) ??
      PLATFORM_LOGO_PATH
    );
  }, [published.logoAssetId]);

  useEffect(() => {
    if (!isPreview && status === "authenticated") {
      window.location.replace("/dashboard");
    }
  }, [isPreview, status]);

  const heroBlock = sections.filter((section) => section.type.toLowerCase() === "hero");
  const highlightsBlock = sections.filter((section) => section.type.toLowerCase() === "highlights");
  const hasHero = heroBlock.length > 0;
  const hasHighlights = highlightsBlock.length > 0;
  const trailingSections = sections.filter((section) => {
    const type = section.type.toLowerCase();
    return type !== "hero" && type !== "highlights" && type !== "footer";
  });
  const footerBlock = sections.filter((section) => section.type.toLowerCase() === "footer");

  const heroImageAssetId =
    heroSection && typeof heroSection.props.heroImageAssetId === "string"
      ? heroSection.props.heroImageAssetId.trim()
      : "";
  const hasHeroBanner = hasHero && Boolean(heroImageAssetId);
  const { scrolled: headerScrolled, anchorRef } = useMarketingHeaderScroll(hasHeroBanner);
  const headerOverHero = hasHeroBanner && !headerScrolled;

  const sectionContext = {
    siteName: published.siteName,
    upcomingActivities,
    showUpcoming,
    previewMode,
  };

  return (
    <div
      ref={anchorRef}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip"
      style={accentStyle}
    >
      {!hasHeroBanner ? <SiteMarketingBackground /> : null}
      {shouldShowPreviewBanner ? <SitePreviewBanner /> : null}

      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          headerOverHero
            ? "border-transparent bg-transparent"
            : "border-b border-border-warm/50 bg-background/75 shadow-sm backdrop-blur-xl backdrop-saturate-150"
        )}
      >
        <div
          className={previewLayoutClass(previewMode, {
            full: "mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5 lg:px-10",
            phone: "flex items-center justify-between gap-2.5 px-4 py-3",
            desktop: "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-10 py-3.5",
          })}
        >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl p-2 transition-colors duration-300 sm:size-11",
              headerOverHero
                ? "bg-white/10 ring-1 ring-white/25 backdrop-blur-[2px]"
                : "bg-card/90 shadow-sm ring-1 ring-border-warm/80 backdrop-blur-sm"
            )}
          >
            <Image
              src={siteLogoUrl}
              alt=""
              width={28}
              height={28}
              className="size-6 object-contain sm:size-7"
              unoptimized={siteLogoUrl.startsWith("http") || siteLogoUrl.includes("/api/")}
            />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-semibold tracking-tight transition-colors duration-300",
                headerOverHero ? "text-white" : "text-text-warm"
              )}
            >
              {published.siteName}
            </p>
            {headerEyebrow ? (
              <p
                className={cn(
                  "truncate text-xs transition-colors duration-300",
                  headerOverHero ? "text-white/70" : "text-text-muted-warm"
                )}
              >
                {headerEyebrow}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "rounded-full border p-0.5 transition-colors duration-300",
              headerOverHero
                ? "border-white/25 bg-white/10 backdrop-blur-[2px]"
                : "border-border-warm/60 bg-card/60 shadow-sm backdrop-blur-sm"
            )}
          >
            <ThemeToggle variant="public" />
          </div>
        </div>
        </div>
      </header>

      <main
        className={previewLayoutClass(previewMode, {
          full: cn(
            "relative z-10 flex w-full min-w-0 flex-1 flex-col",
            hasHero ? "pb-16 pt-0" : "mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-10 lg:pb-24 lg:pt-14"
          ),
          phone: cn(
            "relative z-10 flex w-full min-w-0 flex-1 flex-col",
            hasHero ? "pb-12 pt-0" : "mx-auto max-w-none px-4 pb-12 pt-5"
          ),
          desktop: cn(
            "relative z-10 flex w-full min-w-0 flex-1 flex-col",
            hasHero ? "pb-24 pt-0" : "mx-auto max-w-7xl px-10 pb-24 pt-14"
          ),
        })}
      >
        {hasHero
          ? heroBlock.map((section) => renderSection(section, sectionContext))
          : null}

        {(hasHighlights || trailingSections.length > 0) && (
          <div
            className={previewLayoutClass(previewMode, {
              full: cn(
                "mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-10",
                hasHero && "pt-10 sm:pt-12 lg:pt-16"
              ),
              phone: cn("flex w-full flex-1 flex-col px-4", hasHero && "pt-6"),
              desktop: cn(
                "mx-auto flex w-full max-w-7xl flex-1 flex-col px-10",
                hasHero && "pt-16"
              ),
            })}
          >
            {hasHighlights && (
              <div
                className={previewLayoutClass(previewMode, {
                  full: "space-y-10 sm:space-y-12 lg:space-y-16",
                  phone: "space-y-6",
                  desktop: "space-y-16",
                })}
              >
                {highlightsBlock.map((section) => renderSection(section, sectionContext))}
              </div>
            )}

            {trailingSections.map((section) => renderSection(section, sectionContext))}
          </div>
        )}
      </main>

      {footerBlock.map((section) => renderSection(section, sectionContext))}
    </div>
  );
}
