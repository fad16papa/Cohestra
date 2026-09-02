"use client";

import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { SitePageRenderer } from "@/components/marketing/site-page-renderer";

export function MarketingDemoWebsiteMount() {
  const club = useMarketingDemoClub();

  return (
    <MarketingDemoTheme>
      <div className="relative h-full min-h-0 overflow-hidden bg-paper">
        <SitePageRenderer site={club.website} isPreview showPreviewBanner={false} />
      </div>
    </MarketingDemoTheme>
  );
}
