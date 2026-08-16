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
      "1 operator seat",
      "1 community",
      "4 published activities",
      "250 registrations per month",
      "QR codes and public registration",
      "Client list with dedup and timeline",
      "Simple registration report and CSV export",
      "Registration email notifications",
      "Public stub page with org name and activity links",
    ],
    ctaLabel: "Start free",
    ctaHref: "/signup",
  },
  {
    id: "core",
    name: "Core",
    headline: "For clubs, workshops, and groups running day to day",
    monthlyPrice: "$29",
    annualPrice: "$290 / year",
    annualMonthlyEquivalent: "$24 / mo billed annually",
    trialNote: "30 day free trial. Card required. Not charged until trial ends.",
    features: [
      "3 seats, 3 communities, 12 published activities",
      "500 registrations per month",
      "Website builder (Essentials) — draft, publish, and customize your homepage",
      "Queryable reports with filters and CSV export",
      "Team invites up to your seat cap",
      "QR codes and public registration",
      "Client list with dedup and relationship timeline",
      "Registration email notifications",
    ],
    ctaLabel: "Start trial",
    ctaHref: "/signup?plan=core",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    headline: "For teams that run campaigns and a custom public site",
    monthlyPrice: "$79",
    annualPrice: "$790 / year",
    annualMonthlyEquivalent: "$66 / mo billed annually",
    trialNote: "30 day free trial. Card required. Not charged until trial ends.",
    features: [
      "10 seats, 10 communities, 50 published activities",
      "5,000 registrations per month",
      "Website builder (Studio) — carousel, testimonials, FAQ, stats, video embeds, and premium presets",
      "Email campaigns with segments and templates",
      "Campaign analytics and saved report views",
      "Everything in Core, including team invites",
      "Per organization email sender branding",
      "QR codes, client CRM, and registration emails",
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
  { feature: "Published activities", basic: "4", core: "12", pro: "50" },
  { feature: "Registrations per month", basic: "250", core: "500", pro: "5,000" },
  { feature: "Reports", basic: "Simple and CSV", core: "Queryable and export", pro: "Campaigns and saved views" },
  { feature: "Registration email notifications", basic: "Yes", core: "Yes", pro: "Yes" },
  { feature: "Public site", basic: "Stub only", core: "Builder (Essentials)", pro: "Builder (Studio)" },
  { feature: "Email campaigns", basic: "No", core: "No", pro: "Yes" },
] as const;

export const PRICING_FAQ = [
  {
    question: "Is Basic really free?",
    answer: "Yes. Basic stays free at the limits listed above. No card required.",
  },
  {
    question: "What is the difference between Basic stub and Core website builder?",
    answer:
      "Basic gives a simple public list so QR testing works. Core unlocks the website builder with Essentials sections — hero, highlights, upcoming events, and more — plus draft and publish. Pro adds Studio sections like carousel, testimonials, FAQ, and premium layouts.",
  },
  {
    question: "What reports do I get on Basic?",
    answer:
      "A list of who registered, counts, and timestamps. Export as CSV. Upgrade to Core for filters and deeper ops reports.",
  },
  {
    question: "Can I buy extra seats?",
    answer: "Not as add ons today. Upgrade the plan instead: Basic has 1 seat, Core has 3, Pro has 10.",
  },
] as const;

export const PRICING_POSITIONING_LINE =
  "Priced on registrations, not database size — grow your community without paying for contacts you never use.";
