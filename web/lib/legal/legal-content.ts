export const CURRENT_TERMS_VERSION = "2026-07-21";
export const CURRENT_PRIVACY_VERSION = "2026-07-21";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your use of Cohestra, a multi-tenant community operations platform operated by Cohestra.",
      "By creating an account or using the service, you agree to these Terms and our Privacy Policy.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts & acceptable use",
    paragraphs: [
      "You are responsible for safeguarding your credentials and for activity under your workspace.",
      "You may not use Cohestra to send unlawful spam, harvest personal data without consent, or interfere with platform security.",
      "We may suspend workspaces that violate these Terms or applicable law. Suspension for abuse or policy violations is separate from billing delinquency.",
    ],
  },
  {
    id: "data",
    title: "Customer data",
    paragraphs: [
      "You retain ownership of registration and client data you collect through your activities.",
      "You grant Cohestra a limited license to host, process, and display that data solely to provide the service.",
    ],
  },
  {
    id: "billing",
    title: "Plans & billing",
    paragraphs: [
      "Paid plans are billed in USD. Prices shown on our pricing page may be exclusive of applicable taxes; Stripe Tax is not enabled in v1.",
      "Trials, upgrades, and cancellations follow the plan terms presented at checkout or in the Stripe Customer Portal.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    paragraphs: [
      "We may update these Terms. When we do, we will publish a new version and update the version identifier shown at signup.",
      "Continued use after the effective date constitutes acceptance of the updated Terms.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "This Privacy Policy explains how Cohestra collects, uses, and protects personal information when you use our platform.",
      "Cohestra acts as a processor for registration data your organization collects from participants, and as a controller for account and billing data.",
    ],
  },
  {
    id: "collection",
    title: "Information we collect",
    paragraphs: [
      "Account data: name, email, organization details, and authentication logs for operators.",
      "Registration data: information submitted through public activity forms (for example name, phone, email) on behalf of your organization.",
      "Usage data: device, browser, and diagnostic logs needed to secure and operate the service.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: [
      "To provide and improve Cohestra, authenticate users, deliver email notifications you configure, and comply with law.",
      "We do not sell personal information. We use subprocessors (such as hosting and email delivery providers) under contractual safeguards.",
    ],
  },
  {
    id: "rights",
    title: "Your choices",
    paragraphs: [
      "Operators may export client and registration data from the admin console where plan limits allow.",
      "Participants may contact the organization that collected their data to exercise local privacy rights.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Privacy questions: privacy@cohestra.app",
      "These policies are versioned. The version accepted at signup is stored with your tenant record.",
    ],
  },
];
