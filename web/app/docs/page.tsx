import type { Metadata } from "next";

import { ProductDocsPage } from "@/components/marketing/product-docs-page";

export const metadata: Metadata = {
  title: "Document — How to use Cohestra",
  description:
    "Workspace guide to Cohestra: activities, Form Studio, clients, Follow-up, Website Studio, campaigns, Analytics, and Cohestra AI.",
};

export default function DocsPage() {
  return <ProductDocsPage />;
}
