"use client";

import { usePathname } from "next/navigation";

type AppFooterProps = {
  className?: string;
};

export function AppFooter({ className }: AppFooterProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

  if (pathname === "/" || authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
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
        Powered by{" "}
        <span className="font-medium text-foreground/80">CreativoRare</span>
        <span aria-hidden="true"> · </span>
        <span>{year}</span>
      </p>
    </footer>
  );
}
