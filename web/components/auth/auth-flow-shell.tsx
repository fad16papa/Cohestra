import Link from "next/link";
import Image from "next/image";

import { MarketingWordmark } from "@/components/marketing/marketing-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { PublishedSiteBranding } from "@/lib/site-seo-metadata";
import { PLATFORM_LOGO_PATH, PLATFORM_NAME } from "@/lib/brand-assets";
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
  const tenantName = siteBranding?.siteName?.trim();
  const logoUrl = siteBranding?.logoUrl ?? PLATFORM_LOGO_PATH;
  const isTenantBranded = Boolean(tenantName);

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line/80 px-5 py-4 sm:px-8">
        {isTenantBranded ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line bg-paper-warm p-1.5">
              <Image
                src={logoUrl}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
                unoptimized={logoUrl.includes("/api/")}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{tenantName}</p>
              <p className="text-xs text-stone">Operator workspace</p>
            </div>
          </div>
        ) : (
          <MarketingWordmark />
        )}
        <ThemeToggle variant="public" className="min-h-10 shrink-0 px-3" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className={cn("w-full max-w-[400px] motion-safe:animate-page-enter", className)}>
          <div className="mb-8 text-center">
            <p className="text-section text-gold">{eyebrow}</p>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[1.75rem] font-medium tracking-[-0.02em] text-ink sm:text-3xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone">
              {description}
            </p>
          </div>

          <div className="rounded-[16px] border border-line bg-paper p-6 shadow-[0_20px_40px_rgba(7,13,18,0.05)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:p-8">
            {children}
          </div>

          {footer ? (
            <div className="mt-6 space-y-2 text-center text-sm text-stone">{footer}</div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line px-5 py-4 text-center text-xs text-stone sm:px-8">
        <Link href="/" className="font-medium hover:text-ink">
          Back to cohestra.app
        </Link>
        {!isTenantBranded ? null : (
          <p className="mt-1">
            Powered by{" "}
            <span className="font-medium text-ink">{PLATFORM_NAME}</span>
          </p>
        )}
      </footer>
    </div>
  );
}
