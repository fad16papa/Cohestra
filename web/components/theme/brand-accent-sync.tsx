"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import { buildBrandAccentStyle } from "@/lib/brand-accent";

const ACCENT_VAR_KEYS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--chart-1",
] as const;

function isAdminWorkspacePath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/activities") ||
    pathname.startsWith("/campaigns") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings")
  );
}

function clearAccentVars(target: HTMLElement) {
  for (const key of ACCENT_VAR_KEYS) {
    target.style.removeProperty(key);
  }
}

function applyAccentVars(target: HTMLElement, style: Record<string, string>) {
  for (const [key, value] of Object.entries(style)) {
    target.style.setProperty(key, value);
  }
}

/** Applies accent-tier CSS vars on admin routes only — public pages keep default tokens. */
export function BrandAccentSync() {
  const pathname = usePathname();
  const { profile, status } = useAuth();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const shouldApply =
      status === "authenticated" && isAdminWorkspacePath(pathname);

    if (!shouldApply) {
      clearAccentVars(root);
      return;
    }

    const style = buildBrandAccentStyle(
      profile?.brandAccentColor ?? null,
      resolvedTheme === "dark"
    );

    if (!style) {
      clearAccentVars(root);
      return;
    }

    applyAccentVars(root, style as Record<string, string>);
  }, [pathname, profile?.brandAccentColor, resolvedTheme, status]);

  return null;
}
