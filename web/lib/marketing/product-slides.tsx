import type { ReactNode } from "react";

import {
  MarketingDemoActivitiesMount,
  MarketingDemoAnalyticsMount,
  MarketingDemoClientsMount,
  MarketingDemoFollowupMount,
  MarketingDemoIntelligenceMount,
  MarketingDemoWebsiteMount,
} from "@/components/marketing/demo-mounts";
import { isDemoRoomAvailable } from "@/lib/marketing/marketing-demo-club";

export type ProductSlideId =
  | "website"
  | "clients"
  | "activities"
  | "outreach"
  | "analytics"
  | "intelligence";

/** Caption-only house-tour copy for Live Proof Cinema rooms (landing only). */
export type ProductSlide = {
  id: ProductSlideId;
  navLabel: string;
  /** Feeling word — gold-cinema section label. */
  feeling: string;
  /** Feeling line — Fraunces; keep short for caption strip. */
  feelingLine: string;
  /** One-breath DemoClub scene. */
  scene: string;
  /** ≤3 felt outcomes — caption only, not feature checklist. */
  outcomes: readonly string[];
  /** Visitor job hire — live region / AT. */
  job: string;
  visual: ReactNode;
};

/**
 * House tour order (marketing cinema only — does not rename admin routes):
 * Website → Clients → Activities → Follow-up → Analytics → Cohestra AI
 */
export const PRODUCT_SLIDES: ProductSlide[] = [
  {
    id: "website",
    navLabel: "Website",
    feeling: "Belonging",
    feelingLine: "This is us",
    scene:
      "Harbourline’s public face — Golden Hour filling, Board Game Night and Sunday Pickleball on the same house.",
    outcomes: [
      "Looks like a real club site",
      "34 going · 8 spots left",
      "Same activities as the back office",
    ],
    job: "That could be our club",
    visual: isDemoRoomAvailable("website") ? <MarketingDemoWebsiteMount /> : null,
  },
  {
    id: "clients",
    navLabel: "Clients",
    feeling: "Recognition",
    feelingLine: "These are our people",
    scene:
      "Maya, Daniel, Priya, Marcus, Sarah — and everyone who scanned in — still have names on Monday.",
    outcomes: [
      "Dense list operators actually use",
      "Acquisition and history travel with the person",
      "Next action visible without a spreadsheet",
    ],
    job: "The public crowd becomes known relationships",
    visual: isDemoRoomAvailable("clients") ? <MarketingDemoClientsMount /> : null,
  },
  {
    id: "activities",
    navLabel: "Activities",
    feeling: "Rhythm",
    feelingLine: "This is what we run",
    scene:
      "Golden Hour Run at 34 / 42 — capacity, check-ins, no-shows, and first-timers in one operational board.",
    outcomes: [
      "Registrations against capacity",
      "Attendance and no-shows",
      "Actions the team would take tonight",
    ],
    job: "Cohestra can actually run the club",
    visual: isDemoRoomAvailable("activities") ? <MarketingDemoActivitiesMount /> : null,
  },
  {
    id: "outreach",
    navLabel: "Follow-up",
    feeling: "Urgency",
    feelingLine: "This is who needs us now",
    scene:
      "Due now 6 · At risk 7 · Opportunity 4 — seventeen people who need attention before the week slips.",
    outcomes: [
      "Triage from the dataset, not decoration",
      "Maya due today; Daniel at risk; Priya opportunity",
      "Marcus’s missing phone blocks WhatsApp, not the count",
    ],
    job: "Open the control room",
    visual: isDemoRoomAvailable("outreach") ? <MarketingDemoFollowupMount /> : null,
  },
  {
    id: "analytics",
    navLabel: "Analytics",
    feeling: "Clarity",
    feelingLine: "This is what is working",
    scene:
      "Where repeats come from, which activities grow, first-timer return — answers, not decorative charts.",
    outcomes: [
      "Acquisition that explains repeats",
      "Activity growth from the same week",
      "Follow-up coverage tied to the roster",
    ],
    job: "Answer real operator questions",
    visual: isDemoRoomAvailable("analytics") ? <MarketingDemoAnalyticsMount /> : null,
  },
  {
    id: "intelligence",
    navLabel: "Cohestra AI",
    feeling: "Direction",
    feelingLine: "This is what we should do next",
    scene:
      "Grounded briefs only — six due today, Golden Hour near capacity — every claim reverse-chains to the seed.",
    outcomes: [
      "No chatbot theater",
      "No invented percentages",
      "Same facts as Follow-up and Activities",
    ],
    job: "Tell the operator what to do next",
    visual: isDemoRoomAvailable("intelligence") ? <MarketingDemoIntelligenceMount /> : null,
  },
];

export const PRODUCT_SLIDE_COUNT = PRODUCT_SLIDES.length;
/** Pin track height per surface (vh). Name kept for 33.3 pin math — not chapter pedagogy. */
export const CINEMA_CHAPTER_VH = 70;
export const CINEMA_HYSTERESIS = 0.03;
export const CINEMA_HEADER_OFFSET_PX = 96; // 6rem — matches scroll-mt-24

export const CINEMA_SECTION_THESIS = "Walk the club before you sign up";
export const CINEMA_SECTION_LEAD =
  "A house tour through Harbourline Social Club — the same rooms your team opens on Monday.";
