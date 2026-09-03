import type { ReactNode } from "react";

import {
  MarketingDemoCampaignsMount,
  MarketingDemoClientsMount,
  MarketingDemoDashboardMount,
  MarketingDemoFollowupMount,
  MarketingDemoReportsMount,
  MarketingDemoWebsiteMount,
} from "@/components/marketing/demo-mounts";
import { isDemoRoomAvailable } from "@/lib/marketing/marketing-demo-club";

export type ProductSlideId =
  | "clients"
  | "outreach"
  | "dashboard"
  | "campaigns"
  | "reports"
  | "website";

export type ProductSlide = {
  id: ProductSlideId;
  navLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  points: readonly string[];
  visual: ReactNode;
};

/** Shared chapter copy + DemoClub presentational mounts (landing only — not admin). */
export const PRODUCT_SLIDES: ProductSlide[] = [
  {
    id: "clients",
    navLabel: "Clients",
    eyebrow: "Client CRM",
    title: "A client list your team actually uses",
    lead: "Every registration builds one profile. Search the list, open a client, see their history, and message them without leaving Cohestra.",
    points: [
      "Search and filter by status, nationality, or recent signup",
      "Lead status badges so the team knows who still needs a reply",
      "Full profile with contact details, registration history, and timeline",
      "WhatsApp and Viber open from the profile with messages saved automatically",
    ],
    visual: isDemoRoomAvailable("clients") ? <MarketingDemoClientsMount /> : null,
  },
  {
    id: "outreach",
    navLabel: "Follow-up",
    eyebrow: "Client outreach",
    title: "Message clients on WhatsApp and Viber",
    lead: "Open the channel your community already uses. Cohestra logs what you sent so the team stays aligned and nobody gets double messaged.",
    points: [
      "WhatsApp and Viber open from any client profile",
      "Each message saved on the client timeline automatically",
      "Status flags show who still needs a reply",
      "Dashboard follow-up queue surfaces the next person to contact",
    ],
    visual: isDemoRoomAvailable("outreach") ? <MarketingDemoFollowupMount /> : null,
  },
  {
    id: "dashboard",
    navLabel: "Dashboard",
    eyebrow: "Operations dashboard",
    title: "See what needs attention before your next session",
    lead: "Follow-up coverage, weekly registrations, and active activities in one calm view — no spreadsheet refresh required.",
    points: [
      "Follow-up queue shows who still needs a message",
      "Registration counts compared to last week",
      "Jump to clients, activities, or reports in one click",
      "Updates as your team works through the list",
    ],
    visual: isDemoRoomAvailable("dashboard") ? <MarketingDemoDashboardMount /> : null,
  },
  {
    id: "campaigns",
    navLabel: "Campaigns",
    eyebrow: "Email campaigns",
    title: "Reach your community with segmented email",
    lead: "Compose once, segment by activity or lead status, and track delivery without exporting to a separate email tool.",
    points: [
      "Segment recipients from your client list",
      "Preview on desktop and mobile before you send",
      "Delivery and failure counts on every campaign",
      "Campaign history saved on client profiles",
    ],
    visual: isDemoRoomAvailable("campaigns") ? <MarketingDemoCampaignsMount /> : null,
  },
  {
    id: "reports",
    navLabel: "Reports",
    eyebrow: "Reports and exports",
    title: "Filter performance and export when you need a spreadsheet",
    lead: "Weekly and monthly views with conjunctive filters — then export CSV for board meetings or sponsor updates.",
    points: [
      "Filter by date range, activity, community, or lead status",
      "Registration counts and unique client totals",
      "Export CSV on Basic; deeper filters on Core and Pro",
      "Saved views for recurring check-ins",
    ],
    visual: isDemoRoomAvailable("reports") ? <MarketingDemoReportsMount /> : null,
  },
  {
    id: "website",
    navLabel: "Website",
    eyebrow: "Website builder · Pro",
    title: "Publish a public site tied to your activities",
    lead: "Pro unlocks the full website builder — draft, preview, and publish a homepage at your org subdomain with activities that stay in sync.",
    points: [
      "Studio sections: carousel, testimonials, FAQ, and more",
      "Upcoming activities update from your workspace automatically",
      "Draft, preview on desktop and mobile, then publish in one click",
      "Share kit with QR, link, and WhatsApp text ready to paste",
    ],
    visual: isDemoRoomAvailable("website") ? <MarketingDemoWebsiteMount /> : null,
  },
];

export const PRODUCT_SLIDE_COUNT = PRODUCT_SLIDES.length;
export const CINEMA_CHAPTER_VH = 70;
export const CINEMA_HYSTERESIS = 0.03;
export const CINEMA_HEADER_OFFSET_PX = 96; // 6rem — matches scroll-mt-24
