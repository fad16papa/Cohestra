"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { usePublicTheme } from "@/components/theme/public-theme-context";
import {
  effectivePathname,
  shouldLockMarketingLightTheme,
} from "@/components/theme/theme-config";

/** Midnight Atelier marketing surfaces are light-only — reset dark/system when visiting them. */
export function MarketingThemeLock() {
  const pathname = effectivePathname(usePathname());
  const { setPublicTheme } = usePublicTheme();

  useEffect(() => {
    if (
      !pathname
      || !shouldLockMarketingLightTheme(pathname, window.location.hostname)
    ) {
      return;
    }

    setPublicTheme("light");
    // setPublicTheme is stable; lock only when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname-only lock
  }, [pathname]);

  return null;
}
