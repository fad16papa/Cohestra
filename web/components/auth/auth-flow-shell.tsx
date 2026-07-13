import Link from "next/link";
import Image from "next/image";

import { LoginAmbientBackground } from "@/components/auth/login-ambient-background";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { PublishedSiteBranding } from "@/lib/site-seo-metadata";
import { cn } from "@/lib/utils";

type AuthFlowShellProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  footer?: React.ReactNode;
  className?: string;
  siteBranding?: PublishedSiteBranding | null;
};

export function AuthFlowShell({
  children,
  title,
  description,
  eyebrow = "Operator workspace",
  footer,
  className,
  siteBranding = null,
}: AuthFlowShellProps) {
  const mobileLogoUrl = siteBranding?.logoUrl ?? "/brand/creativorare-logo.png";
  const mobileSiteName = siteBranding?.siteName?.trim() || "Activity Lead";

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:min-h-dvh lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
      <LoginBrandPanel variant="compact" className="lg:hidden" siteBranding={siteBranding} />
      <LoginBrandPanel variant="sidebar" className="hidden lg:flex" siteBranding={siteBranding} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <LoginAmbientBackground />

        <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-card/90 p-1.5 shadow-sm ring-1 ring-border-warm backdrop-blur-sm">
              <Image
                src={mobileLogoUrl}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
                unoptimized={mobileLogoUrl.includes("/api/")}
              />
            </span>
            <span className="text-sm font-semibold text-text-warm">{mobileSiteName}</span>
          </Link>
          <div className="ml-auto rounded-xl bg-card/70 p-0.5 shadow-sm ring-1 ring-border-warm/80 backdrop-blur-sm">
            <ThemeToggle variant="public" className="min-h-10 px-3" />
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-8 sm:px-8 sm:pb-10 lg:px-12 lg:pb-14">
          <div className={cn("w-full max-w-[420px] motion-safe:animate-page-enter", className)}>
            <div className="mb-8 text-center lg:mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-balance text-display-sm text-text-warm sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-muted-warm">
                {description}
              </p>
            </div>

            <div
              className={cn(
                "rounded-3xl border border-border-warm/80 bg-card/85 p-6 shadow-xl shadow-primary/[0.06] backdrop-blur-md sm:p-8",
                "ring-1 ring-black/[0.03] dark:bg-card/90 dark:shadow-black/20 dark:ring-white/[0.06]"
              )}
            >
              {children}
            </div>

            {footer ? <div className="mt-8 text-center text-sm">{footer}</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
