"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const MARKETING_ROUTES = ["/", "/pricing", "/terms", "/privacy", "/signup"];

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

export function MarketingWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-[family-name:var(--font-fraunces)] text-[1.55rem] font-medium tracking-[-0.04em] text-ink",
        className
      )}
    >
      Cohestra
    </Link>
  );
}

export function MarketingShell({
  children,
  scrolled = false,
}: {
  children: ReactNode;
  scrolled?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper text-ink">
      <header
        className={cn(
          "sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10",
          "bg-paper/86 backdrop-blur-xl backdrop-saturate-150",
          scrolled ? "border-b border-line" : "border-b border-transparent"
        )}
      >
        <MarketingWordmark />
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/pricing"
            className="hidden text-sm font-medium text-stone hover:text-ink sm:inline"
          >
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-stone hover:text-ink">
            Sign in
          </Link>
          <div className="hidden sm:block">
            <ThemeToggle variant="public" />
          </div>
          <Link href="/signup" className={marketingAtelierButtonClass("lagoon", "sm")}>
            Start free
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-8 text-sm text-stone sm:px-8 lg:px-10">
      <MarketingWordmark className="text-[1.15rem]" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <p>Built for operators who remember names.</p>
      </div>
    </footer>
  );
}
