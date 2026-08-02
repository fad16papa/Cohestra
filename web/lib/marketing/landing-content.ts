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
    title: "Activity engine",
    description:
      "Create an activity, design its registration form, and publish in minutes. Capacity caps close the door automatically when a session is full.",
  },
  {
    icon: QrCode,
    title: "QR + public registration",
    description:
      "Every activity ships with a QR code and a shareable page. Walk-ins scan, register, and land in your client list — no paper, no re-typing.",
  },
  {
    icon: Users,
    title: "Client CRM with memory",
    description:
      "Registrations dedupe into one client record with a full relationship timeline — who came, returned, and referred, across every activity.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & Viber outreach",
    description:
      "Open a chat with any client in one click and log every touch. Follow-up status keeps the whole team from double-messaging.",
  },
  {
    icon: Mail,
    title: "Email campaigns",
    description:
      "Segment clients by activity, status, or community and send branded campaigns with templates. Every send lands on the client timeline.",
  },
  {
    icon: BarChart3,
    title: "Reports & dashboard",
    description:
      "Follow-up coverage, activity performance, and queryable reports with CSV export. Know what's working before the next session.",
  },
  {
    icon: Globe,
    title: "Website builder",
    description:
      "A branded public homepage at your-org.cohestra.app with upcoming activities fed live from your CRM. Draft, preview, publish — no developer.",
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
    title: "Publish your activity",
    description:
      "Name it, pick a form template, set an optional capacity, and publish. Your registration page and QR code are ready instantly.",
  },
  {
    step: "02",
    title: "Share one link everywhere",
    description:
      "QR at the venue, link in bio, pinned in the group chat. Every registration flows into one deduped client list.",
  },
  {
    step: "03",
    title: "Follow up like you remember",
    description:
      "Open WhatsApp or Viber from the profile, send campaigns, and watch follow-up coverage climb on your dashboard.",
  },
];

export type LandingAudience = {
  label: string;
};

export const LANDING_AUDIENCES: LandingAudience[] = [
  { label: "Tennis & pickleball clubs" },
  { label: "Run crews" },
  { label: "Board game nights" },
  { label: "Yoga & wellness studios" },
  { label: "Creative workshops" },
  { label: "Community meetups" },
];

export type LandingTestimonial = {
  quote: string;
  name: string;
  role: string;
};

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    quote:
      "We ran three communities on Google Forms and a group chat. Cohestra collapsed all of it — now I open one page before every session and I know exactly who's coming back.",
    name: "Marco L.",
    role: "Operator, racquet sports community",
  },
  {
    quote:
      "The QR-to-client-list flow is the feature. People scan at the door, and by Monday I'm following up on WhatsApp without exporting a single spreadsheet.",
    name: "Priya S.",
    role: "Founder, weekend wellness studio",
  },
  {
    quote:
      "Follow-up coverage on the dashboard changed how we work. New registrants stopped falling through the cracks the week we switched.",
    name: "Daniel T.",
    role: "Community lead, social sports club",
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
      "Minutes. Sign up free, publish your first activity with a form template, and share the QR code — most operators are live before their next session.",
  },
  {
    question: "Is Basic really free?",
    answer:
      "Yes — free forever with 1 community, 3 published activities, and 150 registrations a month. No credit card required.",
  },
  {
    question: "Do my clients need an app?",
    answer:
      "No. Clients register on a public web page from any phone — scan the QR or tap your link. Only operators sign in to Cohestra.",
  },
  {
    question: "How does WhatsApp and Viber outreach work?",
    answer:
      "Cohestra opens a chat to the client's number from their profile and logs the touch on their timeline. You send from your own business WhatsApp or Viber — no API setup needed.",
  },
  {
    question: "Can my whole team use it?",
    answer:
      "Core includes 3 seats and Pro includes 10. Invite teammates by email; everyone shares the same client list and follow-up history.",
  },
  {
    question: "What happens when I outgrow a plan?",
    answer:
      "Upgrade in-app any time. Your data, activities, and public pages carry over — Core unlocks your branded site page, Pro unlocks the full website builder and campaigns.",
  },
];
