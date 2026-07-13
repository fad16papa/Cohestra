"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SitePreviewLayoutMode = "phone" | "desktop" | null;

const SitePreviewLayoutContext = createContext<SitePreviewLayoutMode>(null);

export function SitePreviewLayoutProvider({
  mode,
  children,
}: {
  mode: SitePreviewLayoutMode;
  children: ReactNode;
}) {
  return (
    <SitePreviewLayoutContext.Provider value={mode}>
      {children}
    </SitePreviewLayoutContext.Provider>
  );
}

export function useSitePreviewLayout(): SitePreviewLayoutMode {
  return useContext(SitePreviewLayoutContext);
}

type PreviewLayoutClasses = {
  /** Public site — viewport breakpoints (sm:, lg:, etc.). */
  full: string;
  /** Builder phone frame — always mobile layout. */
  phone: string;
  /** Builder desktop frame — always desktop layout at 1280px canvas. */
  desktop: string;
};

/** Pick layout classes for public site vs embedded builder preview. */
export function previewLayoutClass(
  mode: SitePreviewLayoutMode,
  classes: PreviewLayoutClasses
): string {
  if (mode === "phone") {
    return classes.phone;
  }

  if (mode === "desktop") {
    return classes.desktop;
  }

  return classes.full;
}

export const PREVIEW_DESKTOP_CANVAS_WIDTH = 1280;
export const PREVIEW_PHONE_WIDTH = 390;
