import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { CURRENT_PRIVACY_VERSION, PRIVACY_SECTIONS } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Cohestra",
  description: "How Cohestra collects, uses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      version={CURRENT_PRIVACY_VERSION}
      sections={PRIVACY_SECTIONS}
      effectiveLabel="Effective version"
    />
  );
}
