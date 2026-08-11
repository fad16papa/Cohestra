import {
  BarChart3,
  CalendarCheck,
  Globe,
  Mail,
  MessageCircle,
  QrCode,
  Users,
  type LucideIcon,
} from "lucide-react";

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: CalendarCheck,
    title: "Activities",
    description:
      "Create an activity, set the registration form, and publish. When a session is full, registration closes automatically.",
  },
  {
    icon: QrCode,
    title: "QR and public registration",
    description:
      "Every activity gets a QR code and a public page. People scan, register, and show up in your client list. No paper forms.",
  },
  {
    icon: Users,
    title: "Client list with history",
    description:
      "Registrations merge into one profile per person. You can see who joined, who came back, and who referred others across activities.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp and Viber",
    description:
      "Open a chat from a client profile and log what you sent. Status flags help your team avoid messaging the same person twice.",
  },
  {
    icon: Mail,
    title: "Email campaigns",
    description:
      "Send email to segments by activity, status, or community. Each send is recorded on the client timeline.",
  },
  {
    icon: BarChart3,
    title: "Reports and dashboard",
    description:
      "See follow up coverage, activity counts, and filtered reports. Export to CSV when you need a spreadsheet.",
  },
  {
    icon: Globe,
    title: "Public website",
    description:
      "Publish a homepage at your org subdomain with upcoming activities pulled from Cohestra. Draft, preview, then publish.",
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
      "Add the name, pick a form template, set capacity if you need it, and publish. The registration page and QR code are ready right away.",
  },
  {
    step: "02",
    title: "Share the link or QR",
    description:
      "Post the link in your group chat, pin it in bio, or print the QR for the venue. Registrations go into one client list.",
  },
  {
    step: "03",
    title: "Follow up from the list",
    description:
      "Message people on WhatsApp or Viber from their profile, run email when you need it, and track who still needs a reply.",
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

/** Operator outcomes — no attributed quotes until real customer stories are collected. */
export const LANDING_OUTCOMES: LandingOutcome[] = [
  {
    headline: "One list instead of scattered forms",
    description:
      "Registrations from every activity merge into one client profile. Your team stops reconciling spreadsheets before every session.",
  },
  {
    headline: "Follow-up the whole team can see",
    description:
      "WhatsApp and Viber outreach is logged on each profile. Status flags show who still needs a reply — no more duplicate messages in the group chat.",
  },
  {
    headline: "Reports that answer “so what?”",
    description:
      "Living Reports highlight top activities, community share, and follow-up coverage — with CSV export when the board wants a spreadsheet.",
  },
];

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export const LANDING_FAQ: LandingFaqItem[] = [
  {
    question: "How fast can I get set up?",
    answer:
      "Most operators publish their first activity in under an hour. Sign up, pick a form template, share the QR, and you are ready for your next session.",
  },
  {
    question: "Is Basic really free?",
    answer:
      "Yes. Basic stays free with 1 community, 4 published activities, and 250 registrations per month. No credit card required.",
  },
  {
    question: "Do my clients need an app?",
    answer:
      "No. They register on a web page from any phone. Scan the QR or open your link. Only your team signs in to Cohestra.",
  },
  {
    question: "How does WhatsApp and Viber outreach work?",
    answer:
      "Cohestra opens a chat to the client number from their profile and saves a note on the timeline. You send from your own business WhatsApp or Viber account. No API setup.",
  },
  {
    question: "Can my whole team use it?",
    answer:
      "Core includes 3 seats. Pro includes 10. Invite by email so everyone works from the same client list and history.",
  },
  {
    question: "What happens when I outgrow a plan?",
    answer:
      "Upgrade in the app. Your data, activities, and public pages stay. Core adds a branded site page. Pro adds the full website builder and campaigns.",
  },
];
