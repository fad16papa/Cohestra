import type { CSSProperties, ReactNode } from "react";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { PlatformRouteGuard } from "@/components/auth/platform-route-guard";
import { PlatformHeader } from "@/components/platform/platform-header";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-plat-display",
  weight: ["500", "600"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plat-body",
  weight: ["400", "500", "600", "700"],
});

const platformSurfaceStyle = {
  "--plat-ink": "#070D12",
  "--plat-ink-soft": "#141C24",
  "--plat-paper": "#FAFBFC",
  "--plat-paper-warm": "#F3F5F7",
  "--plat-stone": "#8B939C",
  "--plat-line": "#E6E9ED",
  "--plat-line-strong": "#D0D5DB",
  "--plat-lagoon": "#0B6B63",
  "--plat-lagoon-fg": "#F3FFFC",
  "--plat-gold": "#A68B5B",
  "--plat-gold-soft": "#F4EEE3",
  "--plat-danger": "#9B1C1C",
  "--plat-danger-bg": "#FDECEC",
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
      className={`${fraunces.variable} ${jakarta.variable} platform-console min-h-0 flex-1`}
      style={platformSurfaceStyle}
    >
      <PlatformRouteGuard>
        <PlatformHeader />
        <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </PlatformRouteGuard>
    </div>
  );
}
