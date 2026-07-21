export type MarketingPlanId = "basic" | "core" | "pro" | "enterprise";

export type MarketingPlan = {
  id: MarketingPlanId;
  name: string;
  headline: string;
  monthlyPrice: string | null;
  annualPrice: string | null;
  annualMonthlyEquivalent: string | null;
  trialNote: string | null;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
};

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    headline: "Free forever",
    monthlyPrice: "Free",
    annualPrice: null,
    annualMonthlyEquivalent: null,
    trialNote: "No credit card required",
    features: [
      "1 operator seat · 1 community · 3 published activities",
      "150 registrations / month",
      "QR codes + public registration",
      "Client list with dedup + timeline",
      "Simple registration report + CSV export",
      "Public stub page (org name + activity links)",
    ],
    ctaLabel: "Start free",
    ctaHref: "/signup",
  },
  {
    id: "core",
    name: "Core",
    headline: "For small organizations ready to run day-to-day",
    monthlyPrice: "$29",
    annualPrice: "$290 / year",
    annualMonthlyEquivalent: "$24 / mo billed annually",
    trialNote: "30-day free trial · card required · not charged until trial ends",
    features: [
      "3 seats · 3 communities · 12 published activities",
      "500 registrations / month",
      "Fixed public Site Page at {your-org}.cohestra.app",
      "Queryable reports with filters + full CSV export",
    ],
    ctaLabel: "Start trial",
    ctaHref: "/signup?plan=core",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    headline: "For marketing, campaigns, and a custom public site",
    monthlyPrice: "$79",
    annualPrice: "$790 / year",
    annualMonthlyEquivalent: "$66 / mo billed annually",
    trialNote: "30-day free trial · card required · not charged until trial ends",
    features: [
      "10 seats · 10 communities · 50 published activities",
      "5,000 registrations / month",
      "Email campaigns",
      "Website builder — fully customizable homepage",
      "Campaign analytics in reports + saved report views",
    ],
    ctaLabel: "Start trial",
    ctaHref: "/signup?plan=pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    headline: "Custom limits, domain, SSO",
    monthlyPrice: "Custom",
    annualPrice: null,
    annualMonthlyEquivalent: null,
    trialNote: null,
    features: ["Custom limits", "Custom domain", "SSO", "Dedicated support"],
    ctaLabel: "Book a demo",
    ctaHref: "mailto:hello@cohestra.app?subject=Enterprise%20demo",
  },
];

export const PRICING_COMPARE_ROWS = [
  { feature: "Price", basic: "Free", core: "$29/mo", pro: "$79/mo" },
  { feature: "Operator seats", basic: "1", core: "3", pro: "10" },
  { feature: "Communities", basic: "1", core: "3", pro: "10" },
  { feature: "Published activities", basic: "3", core: "12", pro: "50" },
  { feature: "Registrations / month", basic: "150", core: "500", pro: "5,000" },
  { feature: "Reports", basic: "Simple + CSV", core: "Queryable + export", pro: "+ Campaigns + saved views" },
  { feature: "Public site", basic: "Stub only", core: "Fixed Site Page", pro: "Full website builder" },
  { feature: "Email campaigns", basic: "—", core: "—", pro: "✓" },
] as const;

export const PRICING_FAQ = [
  {
    question: "Is Basic really free?",
    answer: "Yes — free forever at the limits above. No card.",
  },
  {
    question: "What's the difference between Basic stub and Core Site Page?",
    answer:
      "Basic gives a simple public list so QR testing works. Core gives a branded fixed homepage. Pro lets you fully design it.",
  },
  {
    question: "What reports do I get on Basic?",
    answer:
      "A straightforward list: who registered, how many, date and time — exportable as CSV. Upgrade to Core for filters and deeper ops reports.",
  },
  {
    question: "Can I buy extra seats?",
    answer:
      "Not in the current plans — upgrade instead (Basic 1 → Core 3 → Pro 10).",
  },
] as const;
