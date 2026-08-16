"use client";

import { usePathname } from "next/navigation";

import { PlatformByline } from "@/components/layouts/platform-byline";

type AppFooterProps = {
  className?: string;
};

export function AppFooter({ className }: AppFooterProps) {
  const pathname = usePathname();

  const marketingRoutes = ["/", "/pricing", "/terms", "/privacy", "/signup", "/docs"];
  const authRoutes = [
    "/login",
    "/platform/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (
    marketingRoutes.includes(pathname) ||
    authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return null;
  }

  return (
    <footer
      className={[
        "shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
        <PlatformByline showYear />
      </p>
    </footer>
  );
}
