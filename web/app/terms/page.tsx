import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { TERMS_SECTIONS } from "@/lib/legal/legal-content";
import { fetchLegalComplianceVersionsServer } from "@/lib/legal/legal-api";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service — Cohestra",
  description: "Cohestra Terms of Service for community operators and workspace administrators.",
};

export default async function TermsPage() {
  let version = CURRENT_TERMS_VERSION;
  try {
    const versions = await fetchLegalComplianceVersionsServer();
    version = versions.termsVersion;
  } catch {
    // Fall back to bundled version when API is unreachable during SSR.
  }

  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      version={version}
      sections={TERMS_SECTIONS}
      effectiveLabel="Effective version"
    />
  );
}
