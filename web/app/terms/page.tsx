import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { CURRENT_TERMS_VERSION, TERMS_SECTIONS } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service — Cohestra",
  description: "Cohestra Terms of Service for community operators and workspace administrators.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      version={CURRENT_TERMS_VERSION}
      sections={TERMS_SECTIONS}
      effectiveLabel="Effective version"
    />
  );
}
