"use client";

import { createContext, useContext } from "react";

import type { ProductSlideId } from "@/lib/marketing/product-slides";

export type MarketingCinemaRollContextValue = {
  activeIndex: number;
  activeId: ProductSlideId;
  /** 0→1 progress within the current room chapter. */
  chapterProgress: number;
  /** Discrete semantic beat for the active room. */
  beat: number;
  beatCount: number;
  reducedMotion: boolean;
};

const MarketingCinemaRollContext = createContext<MarketingCinemaRollContextValue | null>(
  null
);

/** Stable “final frame” when legacy carousel or provider is absent. */
export const CINEMA_ROLL_LEGACY_DEFAULT: MarketingCinemaRollContextValue = {
  activeIndex: 0,
  activeId: "website",
  chapterProgress: 1,
  beat: 2,
  beatCount: 1,
  reducedMotion: true,
};

export function MarketingCinemaRollProvider({
  value,
  children,
}: {
  value: MarketingCinemaRollContextValue;
  children: React.ReactNode;
}) {
  return (
    <MarketingCinemaRollContext.Provider value={value}>
      {children}
    </MarketingCinemaRollContext.Provider>
  );
}

export function useMarketingCinemaRoll(
  roomId: ProductSlideId
): MarketingCinemaRollContextValue {
  const ctx = useContext(MarketingCinemaRollContext);
  if (!ctx) {
    const beatCount =
      roomId === "website"
        ? 1
        : roomId === "analytics"
          ? 2
          : 3;
    return {
      ...CINEMA_ROLL_LEGACY_DEFAULT,
      activeId: roomId,
      beatCount,
      beat: beatCount - 1,
    };
  }
  return ctx;
}
