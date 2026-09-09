"use client";

import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { MarketingDemoWebsiteStudioShell } from "@/components/marketing/demo-mounts/marketing-demo-website-studio-shell";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { SitePageRenderer } from "@/components/marketing/site-page-renderer";

export function MarketingDemoWebsiteMount() {
  const club = useMarketingDemoClub();

  return (
    <MarketingDemoTheme>
      <div
        className="relative h-full min-h-0 overflow-hidden bg-paper pointer-events-none"
        inert
      >
        <MarketingDemoWebsiteStudioShell
          site={club.website}
          siteHostname={club.publicHost}
        >
          <SitePageRenderer
            site={club.website}
            isPreview
            showPreviewBanner={false}
            clubFacingOnly
            cinemaFold
          />
        </MarketingDemoWebsiteStudioShell>
      </div>
    </MarketingDemoTheme>
  );
}
