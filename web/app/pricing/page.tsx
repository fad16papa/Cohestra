import type { Metadata } from "next";

import { PricingPageContent } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Cohestra",
  description:
    "Start free on Basic. Core and Pro plans for teams that need a public homepage, reports, and marketing tools.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
