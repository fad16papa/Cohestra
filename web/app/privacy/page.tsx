import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import {
  CURRENT_PRIVACY_VERSION,
  PRIVACY_SECTIONS,
} from "@/lib/legal/legal-content";
import { fetchLegalComplianceVersionsServer } from "@/lib/legal/legal-api";

export const metadata: Metadata = {
  title: "Privacy Policy — Cohestra",
  description: "How Cohestra collects, uses, and protects personal information.",
};

export default async function PrivacyPage() {
  let version = CURRENT_PRIVACY_VERSION;
  try {
    const versions = await fetchLegalComplianceVersionsServer();
    version = versions.privacyVersion;
  } catch {
    // Fall back to bundled version when API is unreachable during SSR.
  }

  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      version={version}
      sections={PRIVACY_SECTIONS}
      effectiveLabel="Effective version"
    />
  );
}
