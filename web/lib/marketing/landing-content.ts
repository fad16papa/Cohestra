import {
  BarChart3,
  CalendarDays,
  Globe,
  ListTodo,
  Megaphone,
  QrCode,
  Sparkles,
  SquarePen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Plan truth. Do not imply a paid room is included on Basic. */
  plan: string;
};

/**
 * Connected product rooms. Plan notes match nav entitlements and
 * TenantPlanLimits / FormTemplateSlotLimits — not a future roadmap.
 */
export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: CalendarDays,
    title: "Activities",
    plan: "Every plan",
    description:
      "Create an activity, set capacity when you need it, and publish. A full session stops taking registrations.",
  },
  {
    icon: QrCode,
    title: "Registration",
    plan: "Every plan",
    description:
      "Each published activity has a public page and a QR code. People register in the browser. They do not install an app.",
  },
  {
    icon: SquarePen,
    title: "Form Studio",
    plan: "Every plan · saved-form limits differ",
    description:
      "Compose the registration form on the activity. Basic saves 1 form, Core saves 5, and Pro saves 25.",
  },
  {
    icon: Users,
    title: "Clients",
    plan: "Every plan",
    description:
      "Registrations merge into one profile per person, with history across activities. Your team works from that list.",
  },
  {
    icon: ListTodo,
    title: "Follow-up",
    plan: "Every plan",
    description:
      "Follow-up is its own room. Due now, At risk, Opportunity, and Healthy are categories there — not separate products. WhatsApp and Viber notes stay on the profile.",
  },
  {
    icon: Globe,
    title: "Website Studio",
    plan: "Core or higher",
    description:
      "Core publishes a Site Page at your workspace address. Pro adds Studio sections such as carousel, FAQ, and video. Basic keeps a stub page with your name and activity links.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    plan: "Every plan · depth differs",
    description:
      "Basic includes a registration report and CSV export. Core adds filters. Pro adds campaign analytics and saved views.",
  },
  {
    icon: Megaphone,
    title: "Campaigns",
    plan: "Pro or Enterprise",
    description:
      "Send email to a segment by activity, status, or community. Each send is recorded on the client timeline.",
  },
  {
    icon: Sparkles,
    title: "Cohestra AI",
    plan: "Every plan",
    description:
      "A room for the next useful action, with the count or date behind it. If the workspace does not have enough history, Cohestra AI says so.",
  },
];

export type LandingStep = {
  step: string;
  title: string;
  description: string;
};

export const LANDING_STEPS: LandingStep[] = [
  {
    step: "01",
    title: "Publish an activity",
    description:
      "Name it, compose the form in Form Studio, and publish. The public registration page and QR code are part of that activity.",
  },
  {
    step: "02",
    title: "Registration lands on one list",
    description:
      "Share the link or QR. Each signup becomes a client profile. Returning people stay on the same profile across activities.",
  },
  {
    step: "03",
    title: "Follow up from the workspace",
    description:
      "Open Follow-up for who needs a reply. Analytics reads the same list. Cohestra AI names a next step when there is enough history. Website Studio is on Core. Campaigns are on Pro.",
  },
];

/** Anchored marketing chapters — shipped behavior only (PR B). */
export type LandingCapabilityChapter = {
  id: string;
  title: string;
  description: string;
  plan: string;
};

export const LANDING_CAPABILITY_CHAPTERS: LandingCapabilityChapter[] = [
  {
    id: "registration",
    title: "Registration",
    plan: "Every plan",
    description:
      "Each published activity has a public page and a QR code. People register in the browser. They do not install an app.",
  },
  {
    id: "clients",
    title: "Clients",
    plan: "Every plan",
    description:
      "Registrations merge into one profile per person, with history across activities. Your team works from that list.",
  },
  {
    id: "follow-up",
    title: "Follow-up",
    plan: "Every plan",
    description:
      "Follow-up is its own room. Due now, At risk, Opportunity, and Healthy are categories there — not separate products. WhatsApp and Viber notes stay on the profile.",
  },
  {
    id: "website-studio",
    title: "Website Studio",
    plan: "Core or higher",
    description:
      "Core publishes a Site Page at your workspace address. Pro adds Studio sections such as carousel, FAQ, and video. Basic keeps a stub page with your name and activity links.",
  },
  {
    id: "form-studio",
    title: "Form Studio",
    plan: "Every plan · saved-form limits differ",
    description:
      "Compose the registration form on the activity. Basic saves 1 form, Core saves 5, and Pro saves 25.",
  },
  {
    id: "analytics",
    title: "Analytics",
    plan: "Every plan · depth differs",
    description:
      "Basic includes a registration report and CSV export. Core adds filters. Pro adds campaign analytics and saved views.",
  },
];

export type LandingAudience = {
  label: string;
};

export const LANDING_AUDIENCES: LandingAudience[] = [
  { label: "Events" },
  { label: "Community clubs" },
  { label: "Sports clubs" },
  { label: "Workshops" },
  { label: "Groups and meetups" },
  { label: "Run crews" },
  { label: "Board game nights" },
  { label: "Yoga and wellness studios" },
];

export type LandingOutcome = {
  headline: string;
  description: string;
};

/** Product outcomes. Not attributed quotes and not measured customer results. */
export const LANDING_OUTCOMES: LandingOutcome[] = [
  {
    headline: "One profile after every registration",
    description:
      "The public page, the QR code, and later activities write the same client list. The team is not reconciling a separate spreadsheet to see who came back.",
  },
  {
    headline: "Follow-up the whole team can see",
    description:
      "WhatsApp and Viber open from the profile you already have, and the note stays on the timeline. Status on the profile shows who still needs a reply.",
  },
  {
    headline: "Analytics stay attached to the list",
    description:
      "Reports answer who registered and, on higher plans, let you filter and export. They do not become a second database.",
  },
];

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export const LANDING_FAQ: LandingFaqItem[] = [
  {
    question: "What do I do first?",
    answer:
      "Create the workspace, verify your email, publish an activity, and share its registration page or QR code. New signups appear in Clients. Follow-up is a room in the same workspace.",
  },
  {
    question: "Is Basic really free?",
    answer:
      "Yes. Basic stays free with 1 operator seat, 1 community, 4 published activities, and 250 registrations per month. No credit card required.",
  },
  {
    question: "Do people registering need an app?",
    answer:
      "No. They register on a web page from a phone browser. Only your team signs in to Cohestra.",
  },
  {
    question: "Which plans include Website Studio, Form Studio, and Campaigns?",
    answer:
      "Form Studio is on every activity. Saved forms are 1 on Basic, 5 on Core, and 25 on Pro. Website Studio requires Core or higher. Campaigns require Pro. Enterprise includes everything in Pro. A locked room stays visible and names the plan.",
  },
  {
    question: "How does WhatsApp and Viber outreach work?",
    answer:
      "Cohestra opens a chat to the number on the client profile and saves a note on the timeline. You send from your own WhatsApp or Viber account.",
  },
  {
    question: "Can my whole team use it?",
    answer:
      "Basic includes 1 seat. Core includes 3. Pro includes 10. Team invites on Core and Pro share the same client list. A first admin invited by the platform confirms an email code before the account is created.",
  },
];
