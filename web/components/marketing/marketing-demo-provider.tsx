"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  marketingDemoClub,
  type MarketingDemoClub,
} from "@/lib/marketing/marketing-demo-club";

const MarketingDemoContext = createContext<MarketingDemoClub | null>(null);

export function MarketingDemoProvider({ children }: { children: ReactNode }) {
  return (
    <MarketingDemoContext.Provider value={marketingDemoClub}>
      {children}
    </MarketingDemoContext.Provider>
  );
}

export function useMarketingDemoClub(): MarketingDemoClub {
  const club = useContext(MarketingDemoContext);
  if (!club) {
    throw new Error("useMarketingDemoClub must be used within MarketingDemoProvider");
  }
  return club;
}
