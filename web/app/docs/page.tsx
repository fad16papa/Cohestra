import type { Metadata } from "next";

import { ProductDocsPage } from "@/components/marketing/product-docs-page";

export const metadata: Metadata = {
  title: "Document — How to use Cohestra",
  description:
    "A plain-language guide to Cohestra: sign up, create activities, share a QR code, keep a client list, and follow up.",
};

export default function DocsPage() {
  return <ProductDocsPage />;
}
