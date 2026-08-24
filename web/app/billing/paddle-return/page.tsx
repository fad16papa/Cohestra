import type { Metadata } from "next";

import { PaddleReturnPageContent } from "@/components/billing/paddle-return-page-content";

export const metadata: Metadata = {
  title: "Checkout return — Cohestra",
  description: "Returning you to your Cohestra workspace after checkout.",
};

export default function PaddleCheckoutReturnPage() {
  return <PaddleReturnPageContent />;
}
