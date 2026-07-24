"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { isMarketingLightOnlyPath } from "@/components/theme/theme-config";

/** Midnight Atelier marketing surfaces are light-only — reset dark/system when visiting them. */
export function MarketingThemeLock() {
  const pathname = usePathname();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isMarketingLightOnlyPath(pathname)) {
      return;
    }

    setTheme("light");
    // setTheme is stable; lock only when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname-only lock
  }, [pathname]);

  return null;
}
