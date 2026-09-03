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

/** Feeling → Scene → Proof copy for Live Proof Cinema rooms (landing only). */
export type ProductSlide = {
  id: ProductSlideId;
  navLabel: string;
  /** Feeling word — gold-cinema section label (Relief, Connection, …). */
  feeling: string;
  /** Feeling line — Fraunces H3. */
  feelingLine: string;
  /** One-breath DemoClub scene. */
  scene: string;
  /** ≤3 felt outcomes — not feature checklist bullets. */
  outcomes: readonly string[];
  /** Visitor job hire — live region / AT (33.4 cadence). */
  job: string;
  visual: ReactNode;
};

/** Shared feeling copy + DemoClub presentational mounts (landing only — not admin). */
export const PRODUCT_SLIDES: ProductSlide[] = [
  {
    id: "clients",
    navLabel: "Clients",
    feeling: "Relief",
    feelingLine: "Every person who signs up still has a name on Monday",
    scene:
      "Elena scanned Sunday clinic. She is still on the list — not a row in a spreadsheet you meant to file.",
    outcomes: [
      "One profile from every registration",
      "Status the team can act on",
      "History that travels with the person",
    ],
    job: "I won’t lose a person after they scan the QR",
    visual: isDemoRoomAvailable("clients") ? <MarketingDemoClientsMount /> : null,
  },
  {
    id: "outreach",
    navLabel: "Follow-up",
    feeling: "Connection",
    feelingLine: "Message them where they already are — and keep the record",
    scene:
      "WhatsApp to Jordan about Sunday clinic, sitting on the timeline — not in someone’s personal chat.",
    outcomes: [
      "Open WhatsApp or Viber from the person",
      "The send is logged for the whole team",
      "Nobody gets the same ping twice",
    ],
    job: "Messaging lives where the lead lives",
    visual: isDemoRoomAvailable("outreach") ? <MarketingDemoFollowupMount /> : null,
  },
  {
    id: "dashboard",
    navLabel: "Dashboard",
    feeling: "Control",
    feelingLine: "Know what needs you before the session starts",
    scene:
      "Follow-ups still open, this week’s registrations, Sunday clinic on the board — one calm glance.",
    outcomes: [
      "Who still needs a message",
      "This week against last week",
      "Jump to the room that needs you",
    ],
    job: "Monday morning in 10 seconds",
    visual: isDemoRoomAvailable("dashboard") ? <MarketingDemoDashboardMount /> : null,
  },
  {
    id: "campaigns",
    navLabel: "Campaigns",
    feeling: "Reach",
    feelingLine: "Reach the right people without exporting your community",
    scene: "Sunday clinic regulars, not a CSV on someone’s laptop.",
    outcomes: [
      "Segment from the people you already have",
      "Preview before you send",
      "Delivery stays in Cohestra",
    ],
    job: "Email the right segment without exporting",
    visual: isDemoRoomAvailable("campaigns") ? <MarketingDemoCampaignsMount /> : null,
  },
  {
    id: "reports",
    navLabel: "Reports",
    feeling: "Proof",
    feelingLine: "Show the week — not a spreadsheet archaeology dig",
    scene: "Elena counted once. The week is a view, not a scavenger hunt.",
    outcomes: [
      "Filter the week you actually ran",
      "People and registrations, together",
      "Export when a spreadsheet is the meeting",
    ],
    job: "Prove the week to my board",
    visual: isDemoRoomAvailable("reports") ? <MarketingDemoReportsMount /> : null,
  },
  {
    id: "website",
    navLabel: "Website",
    feeling: "Pride",
    feelingLine: "Your public face stays tied to the activities you already run",
    scene:
      "Sunday clinic and board games night on the public page — the same activities as the list, not a second brochure.",
    outcomes: [
      "Activities update from the workspace",
      "Preview, then publish",
      "Share what you already run",
    ],
    job: "Public face and activities stay one organism",
    visual: isDemoRoomAvailable("website") ? <MarketingDemoWebsiteMount /> : null,
  },
];

export const PRODUCT_SLIDE_COUNT = PRODUCT_SLIDES.length;
/** Pin track height per surface (vh). Name kept for 33.3 pin math — not chapter pedagogy. */
export const CINEMA_CHAPTER_VH = 70;
export const CINEMA_HYSTERESIS = 0.03;
export const CINEMA_HEADER_OFFSET_PX = 96; // 6rem — matches scroll-mt-24

export const CINEMA_SECTION_THESIS = "A week with your people";
export const CINEMA_SECTION_LEAD =
  "A week inside a club like yours — the same rooms your team will open on Monday.";
