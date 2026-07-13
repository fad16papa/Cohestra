import Image from "next/image";
import {
  BarChart3,
  Mail,
  QrCode,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublishedSiteBranding } from "@/lib/site-seo-metadata";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

const features: Feature[] = [
  {
    icon: QrCode,
    title: "Launch in minutes",
    description: "QR codes and shareable links for every activity.",
    className: "sm:col-span-1",
  },
  {
    icon: Users,
    title: "One client list",
    description: "Deduped profiles with full registration history.",
    className: "sm:col-span-1",
  },
  {
    icon: Mail,
    title: "Outreach that sticks",
    description: "Consent-aware campaigns with delivery tracking.",
    className: "sm:col-span-2 lg:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Prove what works",
    description: "Live rankings and exportable community reports.",
    className: "sm:col-span-2 lg:col-span-1",
  },
];

const trustPills = [
  "Mobile-first registration",
  "WhatsApp follow-up",
  "SendGrid delivery",
  "Live dashboard",
];

type LoginBrandPanelProps = {
  variant?: "sidebar" | "compact";
  className?: string;
  siteBranding?: PublishedSiteBranding | null;
};

const PLATFORM_LOGO = "/brand/creativorare-logo.png";

function BrandLockup({ siteBranding }: { siteBranding?: PublishedSiteBranding | null }) {
  const siteName = siteBranding?.siteName?.trim();
  const logoUrl = siteBranding?.logoUrl ?? null;
  const useClientBranding = Boolean(siteName);

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-black/10 ring-1 ring-white/40">
        <Image
          src={logoUrl ?? PLATFORM_LOGO}
          alt=""
          width={40}
          height={40}
          className="size-8 object-contain"
          priority
          unoptimized={Boolean(logoUrl?.includes("/api/"))}
        />
      </span>
      <div>
        <p className="text-base font-semibold tracking-tight text-primary-foreground">
          {useClientBranding ? siteName : "Activity Lead"}
        </p>
        <p className="text-xs text-primary-foreground/75">
          {useClientBranding ? "Activity Lead by CreativoRare" : "by CreativoRare"}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const Icon = feature.icon;

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md transition-all duration-300",
        "hover:border-white/30 hover:bg-white/15 hover:shadow-lg hover:shadow-black/10",
        "motion-safe:animate-fade-in-up",
        feature.className
      )}
      style={{ animationDelay: `${120 + index * 80}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-primary-foreground shadow-sm ring-1 ring-white/20">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-foreground">
            {feature.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80 sm:text-sm">
            {feature.description}
          </p>
        </div>
      </div>
    </li>
  );
}

export function LoginBrandPanel({
  variant = "sidebar",
  className,
  siteBranding = null,
}: LoginBrandPanelProps) {
  const isCompact = variant === "compact";

  return (
    <section
      className={cn(
        "relative overflow-hidden text-primary-foreground",
        isCompact
          ? "px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8"
          : "flex flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-14",
        className
      )}
      aria-label="Activity Lead product overview"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#1b4332] via-primary to-[#2d6a4f]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(116,198,157,0.35),transparent_55%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.22),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-16 size-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-16 size-80 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:gap-8">
        <div
          className="flex items-center gap-3 motion-safe:animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <BrandLockup siteBranding={siteBranding} />
        </div>

        <div
          className="max-w-xl motion-safe:animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground/90 backdrop-blur-sm">
            <Sparkles className="size-3.5" aria-hidden />
            Built for community operators
          </span>
          <h1
            className={cn(
              "mt-4 font-bold tracking-tight text-primary-foreground",
              isCompact
                ? "text-[1.75rem] leading-tight sm:text-4xl"
                : "text-public-hero sm:text-[2.25rem] xl:text-[2.5rem]"
            )}
          >
            Every activity becomes a lead engine you can measure.
          </h1>
          <p
            className={cn(
              "mt-4 leading-relaxed text-primary-foreground/85",
              isCompact ? "text-sm sm:text-base" : "max-w-lg text-sm sm:text-base"
            )}
          >
            Launch registrations, nurture your community, and follow up with
            confidence — without spreadsheets or scattered Google Forms.
          </p>
        </div>

        <ul
          className={cn(
            "grid gap-3",
            isCompact
              ? "hidden sm:grid sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:gap-4"
          )}
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </ul>

        {isCompact ? (
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden motion-safe:animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            {trustPills.map((pill) => (
              <span
                key={pill}
                className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground/90 backdrop-blur-sm"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        {!isCompact ? (
          <div
            className="mt-auto hidden flex-wrap gap-2 pt-4 lg:flex motion-safe:animate-fade-in-up"
            style={{ animationDelay: "420ms" }}
          >
            {trustPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-primary-foreground/80 backdrop-blur-sm"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
