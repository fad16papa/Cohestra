import type { CSSProperties, ReactNode } from "react";

import { PlatformRouteGuard } from "@/components/auth/platform-route-guard";
import { AdminSkipLink, MAIN_CONTENT_ID } from "@/components/layouts/admin-skip-link";
import { PlatformHeader } from "@/components/platform/platform-header";

const platformSurfaceStyle = {
  "--font-plat-display": "var(--font-fraunces)",
  "--font-plat-body": "var(--font-jakarta)",
  "--plat-ink": "var(--ink)",
  "--plat-ink-soft": "var(--ink-soft)",
  "--plat-paper": "var(--paper)",
  "--plat-paper-warm": "var(--paper-warm)",
  "--plat-stone": "var(--text-muted)",
  "--plat-header-muted": "#8B939C",
  "--plat-line": "var(--line)",
  "--plat-line-strong": "var(--line-strong)",
  "--plat-lagoon": "var(--lagoon)",
  "--plat-lagoon-fg": "var(--lagoon-fg)",
  "--plat-gold": "var(--gold)",
  "--plat-gold-soft": "var(--gold-soft)",
  "--plat-danger": "var(--danger)",
  "--plat-danger-bg": "var(--surface-danger)",
  "--plat-ring": "var(--ring)",
  background:
    "radial-gradient(1200px 500px at 10% -10%, var(--plat-gold-soft), transparent 55%), linear-gradient(180deg, var(--plat-paper) 0%, var(--plat-paper-warm) 100%)",
  color: "var(--plat-ink)",
  fontFamily: "var(--font-plat-body), ui-sans-serif, system-ui, sans-serif",
} as CSSProperties;

export default function PlatformRootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div
      className="platform-console min-h-0 flex-1"
      style={platformSurfaceStyle}
    >
      <PlatformRouteGuard>
        <AdminSkipLink />
        <PlatformHeader />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-5 py-8 outline-none sm:px-8 sm:py-10"
        >
          {children}
        </main>
      </PlatformRouteGuard>
    </div>
  );
}
