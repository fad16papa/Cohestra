"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingAmbientScene } from "@/components/marketing/marketing-ambient-scene";
import { MarketingCookieConsent } from "@/components/marketing/marketing-cookie-consent";
import { CohestraLogo } from "@/components/marketing/cohestra-logo";
import { PlatformByline } from "@/components/layouts/platform-byline";
import { cn } from "@/lib/utils";

const MARKETING_ROUTES = ["/", "/pricing", "/terms", "/privacy", "/signup", "/docs"];

export function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return MARKETING_ROUTES.includes(pathname);
}

export function marketingAtelierButtonClass(
  variant: "lagoon" | "ghost" | "ink" = "lagoon",
  size: "default" | "sm" = "default"
) {
  return cn(
    "marketing-atelier-btn inline-flex items-center justify-center rounded-[10px] border font-semibold",
    size === "default" ? "h-12 px-5 text-sm" : "h-10 px-4 text-[0.8125rem]",
    variant === "lagoon" &&
      "border-transparent bg-lagoon text-lagoon-fg hover:bg-lagoon-deep",
    variant === "ghost" &&
      "border-line-strong bg-transparent text-ink hover:border-ink/20 hover:bg-paper-warm",
    variant === "ink" &&
      "border-transparent bg-ink text-gold-soft hover:bg-ink-soft"
  );
}

/** Shared card surface with lift, glow, and gradient hover (desktop pointer only). */
export function marketingCardClass(
  variant: "default" | "highlighted" | "dark" | "accent" = "default",
  extra?: string
) {
  return cn(
    "marketing-card rounded-[16px] border",
    variant === "default" && "border-line bg-paper",
    variant === "highlighted" && "marketing-card--highlighted border-lagoon bg-paper",
    variant === "dark" && "marketing-card--dark border-paper/10 bg-paper/[0.04]",
    variant === "accent" && "marketing-card--accent border-lagoon/40 bg-lagoon/[0.06]",
    extra
  );
}

export function marketingCardSurfaceClass(extra?: string) {
  return cn("marketing-card-surface rounded-[14px] border border-line bg-paper", extra);
}

export function MarketingWordmark({ className }: { className?: string }) {
  return <CohestraLogo href="/" size="md" wordmarkClassName={className} />;
}

const MARKETING_NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Document", href: "/docs" },
  { label: "Clients", href: "/#crm" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export function MarketingShell({
  children,
  scrolled = false,
}: {
  children: ReactNode;
  scrolled?: boolean;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <MarketingAmbientScene variant="default" className="opacity-70" />
      <header
        className={cn(
          "sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10",
          "bg-paper/86 backdrop-blur-xl backdrop-saturate-150",
          scrolled ? "border-b border-line" : "border-b border-transparent"
        )}
      >
        <MarketingWordmark />
        <nav className="flex items-center gap-3 sm:gap-5" aria-label="Marketing">
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden text-sm font-medium text-stone hover:text-ink lg:inline"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="text-sm font-medium text-stone hover:text-ink lg:hidden"
          >
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-stone hover:text-ink">
            Sign in
          </Link>
        </nav>
      </header>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      <MarketingCookieConsent />
    </div>
  );
}

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Document", href: "/docs" },
      { label: "Clients", href: "/#crm" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Start free", href: "/signup" },
      { label: "Start Core trial", href: "/signup?plan=core" },
      { label: "Start Pro trial", href: "/signup?plan=pro" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@cohestra.app" },
      { label: "Book a demo", href: "mailto:hello@cohestra.app?subject=Enterprise%20demo" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-paper-warm">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] lg:px-10 lg:py-16">
        <div>
          <MarketingWordmark className="text-[1.3rem]" />
          <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-stone">
            Software for clubs, workshops, and groups. Registration by QR, client list, WhatsApp and
            Viber outreach, and a public site on one platform.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="text-section text-gold">{column.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-stone hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-stone sm:px-8 lg:px-10">
          <p>
            © {new Date().getFullYear()}{" "}
            <PlatformByline
              linkClassName="text-stone hover:text-ink"
            />
            . All rights reserved.
          </p>
          <p>Built for community operators.</p>
        </div>
      </div>
    </footer>
  );
}
