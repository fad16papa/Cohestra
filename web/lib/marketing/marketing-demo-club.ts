import type { ActivityStatus } from "@/lib/activities-api";
import type { CampaignListItem } from "@/lib/campaigns-api";
import type {
  ClientDetail,
  ClientListItem,
  ClientRegistrationHistoryItem,
  ClientTimelineEventType,
  ClientTimelineItem,
  LeadStatus,
  OutreachKind,
} from "@/lib/clients-api";
import type {
  DashboardLeadStatusBreakdown,
  DashboardMetrics,
  DashboardTrendPoint,
} from "@/lib/dashboard-api";
import type {
  PublicHomepageActivity,
  PublicSitePayload,
  SiteSection,
  SiteSectionsDocument,
} from "@/lib/public-site-api";
import type {
  ReportFilters,
  ReportPreset,
  ReportResult,
} from "@/lib/reports-api";

import rawClub from "./marketing-demo-club.json";

export const FORBIDDEN_ORG_PATTERN = /acme|your account|yourclub/i;

export type DemoRoomId =
  | "website"
  | "clients"
  | "activities"
  | "outreach"
  | "analytics"
  | "intelligence";

export type DemoWhatsappQuote = {
  clientId: string;
  body: string;
  loggedAt: string;
};

export type DemoClientRow = ClientListItem & {
  relativeLabel: string;
};

export type DemoClock = {
  timeZoneId: string;
  demoNow: string;
};

export type DemoActivityFixture = {
  id: string;
  name: string;
  startsAt: string;
  capacity: number;
  status: ActivityStatus;
  completed: boolean;
};

export type DemoTriageBucket = "dueNow" | "atRisk" | "opportunity" | "healthy";

export type MarketingDemoClub = {
  orgName: string;
  publicHost: string;
  operatorGreeting: string;
  selectedClientId: string;
  followUpClientId: string;
  availableRooms: DemoRoomId[];
  reportsProofClientIds: string[];
  clientListTotalCount: number;
  clock: DemoClock;
  activities: DemoActivityFixture[];
  whatsappQuote: DemoWhatsappQuote;
  clients: DemoClientRow[];
  clientDetails: Record<string, ClientDetail>;
  dashboard: DashboardMetrics;
  dashboardQueueIds: string[];
  campaigns: CampaignListItem[];
  reportFilters: ReportFilters;
  reports: ReportResult;
  website: PublicSitePayload;
};

export const DEMO_ORG_NAME = "Harbourline Social Club";
export const GOLDEN_HOUR_UPCOMING_ID = "demo-golden-hour-run";
export const ANCHOR_IDS = {
  maya: "demo-maya",
  daniel: "demo-daniel",
  priya: "demo-priya",
  marcus: "demo-marcus",
  sarah: "demo-sarah",
} as const;

const LEAD_STATUSES = new Set<LeadStatus>(["new", "contacted", "active", "inactive"]);
const OUTREACH_KINDS = new Set<OutreachKind>(["whatsapp", "viber", "email"]);
const ACTIVITY_STATUSES = new Set<ActivityStatus>(["draft", "published", "archived"]);
const REPORT_PRESETS = new Set<ReportPreset>(["weekly", "monthly", "custom"]);
const TIMELINE_TYPES = new Set<ClientTimelineEventType>([
  "registration_submitted",
  "lead_status_changed",
  "email_campaign_sent",
  "whatsapp_initiated",
  "whatsapp_follow_up_recorded",
  "viber_initiated",
  "viber_follow_up_recorded",
  "next_follow_up_changed",
  "website_inquiry",
]);
export const REQUIRED_DEMO_ROOMS: readonly DemoRoomId[] = [
  "website",
  "clients",
  "activities",
  "outreach",
  "analytics",
  "intelligence",
];
const ROOMS = new Set<DemoRoomId>(REQUIRED_DEMO_ROOMS);

export type DemoIntelligenceBrief = {
  id: string;
  title: string;
  why: string[];
  anchorClientIds: string[];
  activityIds: string[];
};

export type DemoActivityOps = {
  activity: DemoActivityFixture;
  registered: number;
  spotsLeft: number | null;
  checkedIn: number;
  noShows: number;
  firstTimers: number;
  waitlist: number;
};
const ALLOWED_WEBSITE_SECTION_TYPES = new Set([
  "hero",
  "highlights",
  "upcomingactivities",
  "testimonials",
  "footer",
]);

/** Forbidden: API asset ids / absolute remote URLs. Allowed: empty or same-origin `/demo/*` photography. */
export function isForbiddenDemoAssetRef(value: string | null | undefined): boolean {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("/demo/")) {
    return false;
  }
  return true;
}

/** Short day label for Follow-up WhatsApp chrome (e.g. "Sep 6"). Uses demo clock timezone when provided. */
export function formatDemoWhatsappDay(loggedAt: string, timeZoneId = "Asia/Singapore"): string {
  const date = new Date(loggedAt);
  if (Number.isNaN(date.getTime())) {
    return loggedAt;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timeZoneId,
  });
}

export function getDemoNowMs(club: MarketingDemoClub): number {
  const ms = Date.parse(club.clock.demoNow);
  if (Number.isNaN(ms)) {
    throw new Error("MarketingDemoClub: clock.demoNow is invalid");
  }
  return ms;
}

export function countActivityRegistrations(club: MarketingDemoClub, activityId: string): number {
  let count = 0;
  for (const detail of Object.values(club.clientDetails)) {
    for (const registration of detail.registrationHistory) {
      if (registration.activityId === activityId) {
        count += 1;
      }
    }
  }
  return count;
}

export function getGoldenHourSpots(club: MarketingDemoClub): {
  going: number;
  capacity: number;
  spotsLeft: number;
} {
  const activity = club.activities.find((row) => row.id === GOLDEN_HOUR_UPCOMING_ID);
  if (!activity) {
    throw new Error("MarketingDemoClub: Golden Hour upcoming activity missing");
  }
  const going = countActivityRegistrations(club, GOLDEN_HOUR_UPCOMING_ID);
  return {
    going,
    capacity: activity.capacity,
    spotsLeft: activity.capacity - going,
  };
}

function isArchived(detail: ClientDetail): boolean {
  return detail.leadStatus === "inactive";
}

function isMember(detail: ClientDetail): boolean {
  if (detail.profession?.toLowerCase() === "member") {
    return true;
  }
  if (detail.referralSource?.toLowerCase() === "member") {
    return true;
  }
  const notes = (detail.notes ?? "").toLowerCase();
  if (!notes) {
    return false;
  }
  if (notes.includes("not member") || notes.includes("non-member") || notes.includes("not yet member")) {
    return false;
  }
  return notes.includes("loyal member") || notes.includes("member ·");
}

function hasFutureResolvingFollowUp(detail: ClientDetail, demoNowMs: number): boolean {
  if (!detail.nextFollowUpAt) {
    return false;
  }
  const due = Date.parse(detail.nextFollowUpAt);
  return !Number.isNaN(due) && due > demoNowMs;
}

function hasCompletedFollowUpAfter(detail: ClientDetail, afterMs: number): boolean {
  return detail.timeline.some((event) => {
    const at = Date.parse(event.occurredAt);
    if (Number.isNaN(at) || at < afterMs) {
      return false;
    }
    return (
      event.eventType === "whatsapp_follow_up_recorded" ||
      event.eventType === "viber_follow_up_recorded" ||
      event.eventType === "email_campaign_sent"
    );
  });
}

function earliestAttendanceMs(detail: ClientDetail): number | null {
  let earliest: number | null = null;
  for (const registration of detail.registrationHistory) {
    const at = Date.parse(registration.registeredAt);
    if (Number.isNaN(at)) {
      continue;
    }
    if (earliest === null || at < earliest) {
      earliest = at;
    }
  }
  return earliest;
}

function lastEngagementMs(detail: ClientDetail, client: DemoClientRow): number | null {
  const candidates: number[] = [];
  for (const registration of detail.registrationHistory) {
    const at = Date.parse(registration.registeredAt);
    if (!Number.isNaN(at)) {
      candidates.push(at);
    }
  }
  if (client.lastOutreachAt) {
    const at = Date.parse(client.lastOutreachAt);
    if (!Number.isNaN(at)) {
      candidates.push(at);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return Math.max(...candidates);
}

function hasFutureRegistration(detail: ClientDetail, demoNowMs: number): boolean {
  return detail.registrationHistory.some((registration) => {
    // Upcoming Golden Hour / Board Game / Pickleball registrations after demoNow count as future plan
    const at = Date.parse(registration.registeredAt);
    if (Number.isNaN(at)) {
      return false;
    }
    return (
      registration.activityId === GOLDEN_HOUR_UPCOMING_ID ||
      registration.activityId === "demo-board-game-night" ||
      registration.activityId === "demo-sunday-pickleball"
    ) && at <= demoNowMs + 14 * 86400000;
  });
}

/**
 * dueNow: follow-up due on/before demoNow OR first activity within prior 72h with no qualifying post follow-up;
 * active; not archived; no completed follow-up after trigger; no future scheduled follow-up resolving it.
 */
export function isDueNow(club: MarketingDemoClub, clientId: string): boolean {
  const client = club.clients.find((row) => row.id === clientId);
  const detail = club.clientDetails[clientId];
  if (!client || !detail || isArchived(detail)) {
    return false;
  }
  if (client.leadStatus === "inactive") {
    return false;
  }
  const demoNowMs = getDemoNowMs(club);
  if (hasFutureResolvingFollowUp(detail, demoNowMs)) {
    return false;
  }

  const dueAt = detail.nextFollowUpAt ? Date.parse(detail.nextFollowUpAt) : NaN;
  if (!Number.isNaN(dueAt) && dueAt <= demoNowMs) {
    return true;
  }

  const firstMs = earliestAttendanceMs(detail);
  if (firstMs === null) {
    return false;
  }
  const ageMs = demoNowMs - firstMs;
  if (ageMs < 0 || ageMs > 72 * 3600000) {
    return false;
  }
  if (hasCompletedFollowUpAfter(detail, firstMs)) {
    return false;
  }
  // First-timer path only — do not treat every recent registrant as dueNow
  const notes = (detail.notes ?? "").toLowerCase();
  return notes.includes("first visit") && !client.lastOutreachAt;
}

/**
 * atRisk: prior meaningful engagement; last engagement outside window (~21d+);
 * no future registration plan / active follow-up; not dueNow.
 */
export function isAtRisk(club: MarketingDemoClub, clientId: string): boolean {
  if (isDueNow(club, clientId)) {
    return false;
  }
  const client = club.clients.find((row) => row.id === clientId);
  const detail = club.clientDetails[clientId];
  if (!client || !detail || isArchived(detail)) {
    return false;
  }
  if (detail.registrationHistory.length < 2) {
    return false;
  }
  const demoNowMs = getDemoNowMs(club);
  if (hasFutureResolvingFollowUp(detail, demoNowMs)) {
    return false;
  }
  if (detail.nextFollowUpAt) {
    return false;
  }
  // Upcoming event registration after quiet period still counts as a plan — exclude if registered for upcoming Golden Hour
  if (detail.registrationHistory.some((r) => r.activityId === GOLDEN_HOUR_UPCOMING_ID)) {
    return false;
  }
  const lastMs = lastEngagementMs(detail, client);
  if (lastMs === null) {
    return false;
  }
  const quietMs = demoNowMs - lastMs;
  return quietMs >= 21 * 86400000;
}

/**
 * opportunity: strong repeat intent, not member, open next step; not dueNow/atRisk.
 */
export function isOpportunity(club: MarketingDemoClub, clientId: string): boolean {
  if (isDueNow(club, clientId) || isAtRisk(club, clientId)) {
    return false;
  }
  const client = club.clients.find((row) => row.id === clientId);
  const detail = club.clientDetails[clientId];
  if (!client || !detail || isArchived(detail) || isMember(detail)) {
    return false;
  }
  if (detail.nextFollowUpAt) {
    return false;
  }
  if (detail.registrationHistory.length < 2) {
    return false;
  }
  const referral = (detail.referralSource ?? "").toLowerCase();
  return referral.includes("referral") || detail.notes?.toLowerCase().includes("opportunity") === true;
}

export function getTriageBucket(club: MarketingDemoClub, clientId: string): DemoTriageBucket {
  if (isDueNow(club, clientId)) {
    return "dueNow";
  }
  if (isAtRisk(club, clientId)) {
    return "atRisk";
  }
  if (isOpportunity(club, clientId)) {
    return "opportunity";
  }
  return "healthy";
}

export function countNeedAttention(club: MarketingDemoClub): {
  dueNow: number;
  atRisk: number;
  opportunity: number;
  total: number;
} {
  let dueNow = 0;
  let atRisk = 0;
  let opportunity = 0;
  for (const client of club.clients) {
    const bucket = getTriageBucket(club, client.id);
    if (bucket === "dueNow") {
      dueNow += 1;
    } else if (bucket === "atRisk") {
      atRisk += 1;
    } else if (bucket === "opportunity") {
      opportunity += 1;
    }
  }
  return { dueNow, atRisk, opportunity, total: dueNow + atRisk + opportunity };
}

export function listClientsByTriage(
  club: MarketingDemoClub,
  bucket: DemoTriageBucket
): DemoClientRow[] {
  return club.clients.filter((client) => getTriageBucket(club, client.id) === bucket);
}

export function getActivityRegistrants(
  club: MarketingDemoClub,
  activityId: string
): DemoClientRow[] {
  const ids = new Set<string>();
  for (const [clientId, detail] of Object.entries(club.clientDetails)) {
    if (detail.registrationHistory.some((row) => row.activityId === activityId)) {
      ids.add(clientId);
    }
  }
  return club.clients.filter((client) => ids.has(client.id));
}

function notesBlob(detail: ClientDetail): string {
  const notes = detail.notes ?? "";
  const timeline = detail.timeline.map((event) => event.note ?? "").join(" ");
  return `${notes} ${timeline}`.toLowerCase();
}

export function getActivityOps(club: MarketingDemoClub, activityId: string): DemoActivityOps {
  const activity = club.activities.find((row) => row.id === activityId);
  if (!activity) {
    throw new Error(`MarketingDemoClub: activity ${activityId} missing`);
  }
  const registrants = getActivityRegistrants(club, activityId);
  let checkedIn = 0;
  let noShows = 0;
  let firstTimers = 0;
  for (const client of registrants) {
    const detail = club.clientDetails[client.id];
    if (!detail) {
      continue;
    }
    const blob = notesBlob(detail);
    // Attendance outcomes only apply after the session ran — do not bleed prior-session
    // "checked in" notes onto an upcoming roster.
    if (activity.completed) {
      if (blob.includes("no-show") || blob.includes("no show")) {
        noShows += 1;
      } else if (blob.includes("checked in") || blob.includes("check-in")) {
        checkedIn += 1;
      } else {
        checkedIn += 1;
      }
    }
    if (blob.includes("first visit") || blob.includes("first-timer") || blob.includes("first timer")) {
      firstTimers += 1;
    }
  }
  const registered = countActivityRegistrations(club, activityId);
  const spotsLeft = activity.completed ? null : Math.max(0, activity.capacity - registered);
  const waitlist =
    !activity.completed && registered > activity.capacity ? registered - activity.capacity : 0;
  return {
    activity,
    registered,
    spotsLeft,
    checkedIn,
    noShows,
    firstTimers,
    waitlist,
  };
}

/**
 * Seed-grounded operator briefs for Cohestra AI cinema — no invented %.
 * Reverse-chain: each brief cites triage / capacity / anchor facts already in the seed.
 */
export function getIntelligenceBriefs(club: MarketingDemoClub): DemoIntelligenceBrief[] {
  const attention = countNeedAttention(club);
  const spots = getGoldenHourSpots(club);
  const dueNowClients = listClientsByTriage(club, "dueNow");
  const atRiskClients = listClientsByTriage(club, "atRisk");
  const opportunityClients = listClientsByTriage(club, "opportunity");
  const briefs: DemoIntelligenceBrief[] = [
    {
      id: "due-now-first-timers",
      title: `${attention.dueNow} people need follow-up today`,
      why: [
        "Attended or registered within the last 72 hours, or follow-up is due today",
        "No qualifying WhatsApp, Viber, or email follow-up after that trigger",
      ],
      anchorClientIds: dueNowClients
        .map((client) => client.id)
        .filter((id) => (Object.values(ANCHOR_IDS) as string[]).includes(id)),
      activityIds: [GOLDEN_HOUR_UPCOMING_ID, "demo-golden-hour-run-prior"],
    },
    {
      id: "golden-hour-capacity",
      title: "Golden Hour Run is approaching capacity",
      why: [
        `${spots.going} of ${spots.capacity} registered for Friday’s run`,
        `${spots.spotsLeft} spots left before the session fills`,
      ],
      anchorClientIds: [ANCHOR_IDS.maya, ANCHOR_IDS.sarah],
      activityIds: [GOLDEN_HOUR_UPCOMING_ID],
    },
  ];
  if (atRiskClients.length > 0) {
    const daniel = atRiskClients.find((client) => client.id === ANCHOR_IDS.daniel);
    briefs.push({
      id: "at-risk-reengage",
      title: `${attention.atRisk} previously engaged people are at risk`,
      why: [
        "Last meaningful engagement was 21 or more days ago",
        "No upcoming registration and no scheduled follow-up",
        daniel
          ? `${daniel.fullName}: quiet since the last Golden Hour cycle`
          : "Includes the at-risk roster already on the Follow-up board",
      ],
      anchorClientIds: atRiskClients
        .map((client) => client.id)
        .filter((id) => (Object.values(ANCHOR_IDS) as string[]).includes(id)),
      activityIds: ["demo-golden-hour-run-prior"],
    });
  }
  if (opportunityClients.length > 0) {
    briefs.push({
      id: "opportunity-intent",
      title: `${attention.opportunity} strong-intent repeats are open opportunities`,
      why: [
        "Repeat participation with referral / opportunity signal",
        "Not marked member; no open next-follow-up resolving the thread",
      ],
      anchorClientIds: opportunityClients
        .map((client) => client.id)
        .filter((id) => (Object.values(ANCHOR_IDS) as string[]).includes(id)),
      activityIds: [GOLDEN_HOUR_UPCOMING_ID, "demo-board-game-night"],
    });
  }
  return briefs;
}

export function canRecommendWhatsApp(club: MarketingDemoClub, clientId: string): boolean {
  const detail = club.clientDetails[clientId];
  if (!detail) {
    return false;
  }
  return typeof detail.phone === "string" && detail.phone.trim().length > 0;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`MarketingDemoClub: ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`MarketingDemoClub: ${label} must be a non-empty string`);
  }
  return value;
}

function asPlainString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`MarketingDemoClub: ${label} must be a string`);
  }
  return value;
}

function asStringOrNull(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`MarketingDemoClub: ${label} must be a string or null`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`MarketingDemoClub: ${label} must be a number`);
  }
  return value;
}

function asActivityStatus(value: unknown, label: string): ActivityStatus {
  const status = asString(value, label);
  if (!ACTIVITY_STATUSES.has(status as ActivityStatus)) {
    throw new Error(`MarketingDemoClub: ${label} is not an ActivityStatus`);
  }
  return status as ActivityStatus;
}

function asReportPreset(value: unknown, label: string): ReportPreset {
  const preset = asString(value, label);
  if (!REPORT_PRESETS.has(preset as ReportPreset)) {
    throw new Error(`MarketingDemoClub: ${label} is not a ReportPreset`);
  }
  return preset as ReportPreset;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`MarketingDemoClub: ${label} must be a boolean`);
  }
  return value;
}

function asLeadStatus(value: unknown, label: string): LeadStatus {
  if (typeof value !== "string" || !LEAD_STATUSES.has(value as LeadStatus)) {
    throw new Error(`MarketingDemoClub: ${label} is not a LeadStatus`);
  }
  return value as LeadStatus;
}

function asOutreachKind(value: unknown, label: string): OutreachKind | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || !OUTREACH_KINDS.has(value as OutreachKind)) {
    throw new Error(`MarketingDemoClub: ${label} is not an OutreachKind`);
  }
  return value as OutreachKind;
}

function parseClientRow(raw: unknown, index: number): DemoClientRow {
  const row = asRecord(raw, `clients[${index}]`);
  return {
    id: asString(row.id, `clients[${index}].id`),
    fullName: asString(row.fullName, `clients[${index}].fullName`),
    phone: asStringOrNull(row.phone, `clients[${index}].phone`),
    email: asStringOrNull(row.email, `clients[${index}].email`),
    consentGiven: asBoolean(row.consentGiven, `clients[${index}].consentGiven`),
    nationality: asStringOrNull(row.nationality, `clients[${index}].nationality`),
    leadStatus: asLeadStatus(row.leadStatus, `clients[${index}].leadStatus`),
    lastRegistrationAt: asStringOrNull(row.lastRegistrationAt, `clients[${index}].lastRegistrationAt`),
    lastActivityName: asStringOrNull(row.lastActivityName, `clients[${index}].lastActivityName`),
    lastOutreachAt: asStringOrNull(row.lastOutreachAt, `clients[${index}].lastOutreachAt`),
    lastOutreachKind: asOutreachKind(row.lastOutreachKind, `clients[${index}].lastOutreachKind`),
    nextFollowUpAt: asStringOrNull(row.nextFollowUpAt, `clients[${index}].nextFollowUpAt`),
    relativeLabel: asString(row.relativeLabel, `clients[${index}].relativeLabel`),
  };
}

function parseTimelineItem(raw: unknown, label: string): ClientTimelineItem {
  const row = asRecord(raw, label);
  const eventType = asString(row.eventType, `${label}.eventType`);
  if (!TIMELINE_TYPES.has(eventType as ClientTimelineEventType)) {
    throw new Error(`MarketingDemoClub: ${label}.eventType is invalid`);
  }
  return {
    eventType: eventType as ClientTimelineEventType,
    occurredAt: asString(row.occurredAt, `${label}.occurredAt`),
    label: asString(row.label, `${label}.label`),
    activityName: asStringOrNull(row.activityName, `${label}.activityName`),
    referralSource: asStringOrNull(row.referralSource, `${label}.referralSource`),
    previousLeadStatus:
      row.previousLeadStatus === null
        ? null
        : asLeadStatus(row.previousLeadStatus, `${label}.previousLeadStatus`),
    newLeadStatus:
      row.newLeadStatus === null ? null : asLeadStatus(row.newLeadStatus, `${label}.newLeadStatus`),
    registrationId: asStringOrNull(row.registrationId, `${label}.registrationId`),
    campaignSubject: asStringOrNull(row.campaignSubject, `${label}.campaignSubject`),
    note: asStringOrNull(row.note, `${label}.note`),
  };
}

function parseRegistration(raw: unknown, label: string): ClientRegistrationHistoryItem {
  const row = asRecord(raw, label);
  return {
    registrationId: asString(row.registrationId, `${label}.registrationId`),
    registrationNumber: asString(row.registrationNumber, `${label}.registrationNumber`),
    activityId: asString(row.activityId, `${label}.activityId`),
    activityName: asString(row.activityName, `${label}.activityName`),
    registeredAt: asString(row.registeredAt, `${label}.registeredAt`),
    answers: [],
  };
}

function parseClientDetail(raw: unknown, label: string): ClientDetail {
  const row = asRecord(raw, label);
  const history = Array.isArray(row.registrationHistory) ? row.registrationHistory : [];
  const timeline = Array.isArray(row.timeline) ? row.timeline : [];
  return {
    id: asString(row.id, `${label}.id`),
    fullName: asString(row.fullName, `${label}.fullName`),
    phone: asStringOrNull(row.phone, `${label}.phone`),
    email: asStringOrNull(row.email, `${label}.email`),
    profession: asStringOrNull(row.profession, `${label}.profession`),
    nationality: asStringOrNull(row.nationality, `${label}.nationality`),
    residency: asStringOrNull(row.residency, `${label}.residency`),
    consentGiven: asBoolean(row.consentGiven, `${label}.consentGiven`),
    referralSource: asStringOrNull(row.referralSource, `${label}.referralSource`),
    notes: asStringOrNull(row.notes, `${label}.notes`),
    leadStatus: asLeadStatus(row.leadStatus, `${label}.leadStatus`),
    isMergeSuspect: asBoolean(row.isMergeSuspect, `${label}.isMergeSuspect`),
    nextFollowUpAt: asStringOrNull(row.nextFollowUpAt, `${label}.nextFollowUpAt`),
    createdAt: asString(row.createdAt, `${label}.createdAt`),
    updatedAt: asString(row.updatedAt, `${label}.updatedAt`),
    registrationHistory: history.map((item, index) =>
      parseRegistration(item, `${label}.registrationHistory[${index}]`)
    ),
    timeline: timeline.map((item, index) => parseTimelineItem(item, `${label}.timeline[${index}]`)),
  };
}

function parseDashboard(raw: unknown): DashboardMetrics {
  const row = asRecord(raw, "dashboard");
  const performance = Array.isArray(row.activityPerformance) ? row.activityPerformance : [];
  const trend = Array.isArray(row.registrationsTrend) ? row.registrationsTrend : [];
  const breakdown = asRecord(row.leadStatusBreakdown, "dashboard.leadStatusBreakdown");
  return {
    totalLeads: asNumber(row.totalLeads, "dashboard.totalLeads"),
    newLeadsInPeriod: asNumber(row.newLeadsInPeriod, "dashboard.newLeadsInPeriod"),
    periodDays: asNumber(row.periodDays, "dashboard.periodDays"),
    activeActivitiesCount: asNumber(row.activeActivitiesCount, "dashboard.activeActivitiesCount"),
    followUpCoveragePercent: asNumber(
      row.followUpCoveragePercent,
      "dashboard.followUpCoveragePercent"
    ),
    activityPerformance: performance.map((item, index) => {
      const activity = asRecord(item, `dashboard.activityPerformance[${index}]`);
      return {
        activityId: asString(activity.activityId, `dashboard.activityPerformance[${index}].activityId`),
        activityName: asString(
          activity.activityName,
          `dashboard.activityPerformance[${index}].activityName`
        ),
        communityLabel: asString(
          activity.communityLabel,
          `dashboard.activityPerformance[${index}].communityLabel`
        ),
        category: asString(activity.category, `dashboard.activityPerformance[${index}].category`),
        status: asActivityStatus(
          activity.status,
          `dashboard.activityPerformance[${index}].status`
        ),
        registrationCount: asNumber(
          activity.registrationCount,
          `dashboard.activityPerformance[${index}].registrationCount`
        ),
      };
    }),
    computedAt: asString(row.computedAt, "dashboard.computedAt"),
    registrationsInPeriod: asNumber(row.registrationsInPeriod, "dashboard.registrationsInPeriod"),
    registrationsInPreviousPeriod: asNumber(
      row.registrationsInPreviousPeriod,
      "dashboard.registrationsInPreviousPeriod"
    ),
    trendDays: asNumber(row.trendDays, "dashboard.trendDays"),
    registrationsTrend: trend.map((item, index): DashboardTrendPoint => {
      const point = asRecord(item, `dashboard.registrationsTrend[${index}]`);
      return {
        date: asString(point.date, `dashboard.registrationsTrend[${index}].date`),
        registrations: asNumber(point.registrations, `dashboard.registrationsTrend[${index}].registrations`),
        newClients: asNumber(point.newClients, `dashboard.registrationsTrend[${index}].newClients`),
      };
    }),
    leadStatusBreakdown: {
      newCount: asNumber(breakdown.newCount, "dashboard.leadStatusBreakdown.newCount"),
      contactedCount: asNumber(breakdown.contactedCount, "dashboard.leadStatusBreakdown.contactedCount"),
      activeCount: asNumber(breakdown.activeCount, "dashboard.leadStatusBreakdown.activeCount"),
      inactiveCount: asNumber(breakdown.inactiveCount, "dashboard.leadStatusBreakdown.inactiveCount"),
    } satisfies DashboardLeadStatusBreakdown,
  };
}

function parseWebsite(raw: unknown): PublicSitePayload {
  const row = asRecord(raw, "website");
  const published = asRecord(row.published, "website.published");
  const sections = Array.isArray(published.sections) ? published.sections : [];
  const activities = Array.isArray(row.upcomingActivities) ? row.upcomingActivities : [];
  const document: SiteSectionsDocument = {
    schemaVersion: asNumber(published.schemaVersion, "website.published.schemaVersion"),
    siteName: asString(published.siteName, "website.published.siteName"),
    accentColor: asStringOrNull(published.accentColor, "website.published.accentColor"),
    logoAssetId: asStringOrNull(published.logoAssetId, "website.published.logoAssetId"),
    presetId: asStringOrNull(published.presetId, "website.published.presetId"),
    sections: sections.map((item, index): SiteSection => {
      const section = asRecord(item, `website.published.sections[${index}]`);
      return {
        id: asString(section.id, `website.published.sections[${index}].id`),
        type: asString(section.type, `website.published.sections[${index}].type`),
        enabled: asBoolean(section.enabled, `website.published.sections[${index}].enabled`),
        order: asNumber(section.order, `website.published.sections[${index}].order`),
        props:
          typeof section.props === "object" &&
          section.props !== null &&
          !Array.isArray(section.props)
            ? (section.props as Record<string, unknown>)
            : {},
      };
    }),
  };
  return {
    published: document,
    publishedAt: asStringOrNull(row.publishedAt, "website.publishedAt"),
    upcomingActivities: activities.map((item, index): PublicHomepageActivity => {
      const activity = asRecord(item, `website.upcomingActivities[${index}]`);
      return {
        slug: asString(activity.slug, `website.upcomingActivities[${index}].slug`),
        name: asString(activity.name, `website.upcomingActivities[${index}].name`),
        schedule: asString(activity.schedule, `website.upcomingActivities[${index}].schedule`),
        location: asString(activity.location, `website.upcomingActivities[${index}].location`),
        communityLabel: asString(
          activity.communityLabel,
          `website.upcomingActivities[${index}].communityLabel`
        ),
        heroImageUrl: asStringOrNull(
          activity.heroImageUrl,
          `website.upcomingActivities[${index}].heroImageUrl`
        ),
        accentColor: asStringOrNull(
          activity.accentColor,
          `website.upcomingActivities[${index}].accentColor`
        ),
      };
    }),
  };
}

export function parseMarketingDemoClub(raw: unknown): MarketingDemoClub {
  const row = asRecord(raw, "root");
  const clientsRaw = Array.isArray(row.clients) ? row.clients : [];
  const detailsRaw = asRecord(row.clientDetails, "clientDetails");
  const roomsRaw = Array.isArray(row.availableRooms) ? row.availableRooms : [];
  const proofIds = Array.isArray(row.reportsProofClientIds) ? row.reportsProofClientIds : [];
  const queueIds = Array.isArray(row.dashboardQueueIds) ? row.dashboardQueueIds : [];
  const campaignsRaw = Array.isArray(row.campaigns) ? row.campaigns : [];
  const quote = asRecord(row.whatsappQuote, "whatsappQuote");
  const filters = asRecord(row.reportFilters, "reportFilters");
  const reports = asRecord(row.reports, "reports");
  const followUp = asRecord(reports.followUpStatus, "reports.followUpStatus");
  const growth = asRecord(reports.leadGrowth, "reports.leadGrowth");
  const campaignResults = asRecord(reports.campaignResults, "reports.campaignResults");
  const prior = asRecord(reports.priorPeriod, "reports.priorPeriod");
  const period = asRecord(reports.period, "reports.period");
  const ranking = Array.isArray(reports.activityRanking) ? reports.activityRanking : [];
  const communities = Array.isArray(reports.communityRanking) ? reports.communityRanking : [];
  const trend = Array.isArray(reports.dailyTrend) ? reports.dailyTrend : [];

  const clientDetails: Record<string, ClientDetail> = {};
  for (const [id, detail] of Object.entries(detailsRaw)) {
    clientDetails[id] = parseClientDetail(detail, `clientDetails.${id}`);
  }

  return {
    orgName: asString(row.orgName, "orgName"),
    publicHost: asString(row.publicHost, "publicHost"),
    operatorGreeting: asString(row.operatorGreeting, "operatorGreeting"),
    selectedClientId: asString(row.selectedClientId, "selectedClientId"),
    followUpClientId: asString(row.followUpClientId, "followUpClientId"),
    availableRooms: roomsRaw.map((room, index) => {
      const id = asString(room, `availableRooms[${index}]`);
      if (!ROOMS.has(id as DemoRoomId)) {
        throw new Error(`MarketingDemoClub: availableRooms[${index}] is not a room id`);
      }
      return id as DemoRoomId;
    }),
    reportsProofClientIds: proofIds.map((id, index) =>
      asString(id, `reportsProofClientIds[${index}]`)
    ),
    clientListTotalCount: asNumber(row.clientListTotalCount, "clientListTotalCount"),
    clock: (() => {
      const clock = asRecord(row.clock, "clock");
      return {
        timeZoneId: asString(clock.timeZoneId, "clock.timeZoneId"),
        demoNow: asString(clock.demoNow, "clock.demoNow"),
      };
    })(),
    activities: (() => {
      const activitiesRaw = Array.isArray(row.activities) ? row.activities : [];
      return activitiesRaw.map((item, index): DemoActivityFixture => {
        const activity = asRecord(item, `activities[${index}]`);
        return {
          id: asString(activity.id, `activities[${index}].id`),
          name: asString(activity.name, `activities[${index}].name`),
          startsAt: asString(activity.startsAt, `activities[${index}].startsAt`),
          capacity: asNumber(activity.capacity, `activities[${index}].capacity`),
          status: asActivityStatus(activity.status, `activities[${index}].status`),
          completed: asBoolean(activity.completed, `activities[${index}].completed`),
        };
      });
    })(),
    whatsappQuote: {
      clientId: asString(quote.clientId, "whatsappQuote.clientId"),
      body: asString(quote.body, "whatsappQuote.body"),
      loggedAt: asString(quote.loggedAt, "whatsappQuote.loggedAt"),
    },
    clients: clientsRaw.map(parseClientRow),
    clientDetails,
    dashboard: parseDashboard(row.dashboard),
    dashboardQueueIds: queueIds.map((id, index) => asString(id, `dashboardQueueIds[${index}]`)),
    campaigns: campaignsRaw.map((item, index): CampaignListItem => {
      const campaign = asRecord(item, `campaigns[${index}]`);
      return {
        id: asString(campaign.id, `campaigns[${index}].id`),
        subject: asString(campaign.subject, `campaigns[${index}].subject`),
        sentAt: asString(campaign.sentAt, `campaigns[${index}].sentAt`),
        sentCount: asNumber(campaign.sentCount, `campaigns[${index}].sentCount`),
        failedCount: asNumber(campaign.failedCount, `campaigns[${index}].failedCount`),
        skippedCount: asNumber(campaign.skippedCount, `campaigns[${index}].skippedCount`),
        status: asString(campaign.status, `campaigns[${index}].status`),
      };
    }),
    reportFilters: {
      preset: asReportPreset(filters.preset, "reportFilters.preset"),
      from: asString(filters.from, "reportFilters.from"),
      to: asString(filters.to, "reportFilters.to"),
      activityId: asPlainString(filters.activityId, "reportFilters.activityId"),
      community: asPlainString(filters.community, "reportFilters.community"),
      leadStatus:
        filters.leadStatus === ""
          ? ""
          : asLeadStatus(filters.leadStatus, "reportFilters.leadStatus"),
      referralSource: asPlainString(filters.referralSource, "reportFilters.referralSource"),
    },
    reports: {
      period: {
        preset: asReportPreset(period.preset, "reports.period.preset") as string,
        startAt: asString(period.startAt, "reports.period.startAt"),
        endAt: asString(period.endAt, "reports.period.endAt"),
        computedAt: asString(period.computedAt, "reports.period.computedAt"),
      },
      activitiesHosted: asNumber(reports.activitiesHosted, "reports.activitiesHosted"),
      registrations: asNumber(reports.registrations, "reports.registrations"),
      newLeads: asNumber(reports.newLeads, "reports.newLeads"),
      followUpStatus: {
        newCount: asNumber(followUp.newCount, "reports.followUpStatus.newCount"),
        contactedCount: asNumber(followUp.contactedCount, "reports.followUpStatus.contactedCount"),
        activeCount: asNumber(followUp.activeCount, "reports.followUpStatus.activeCount"),
        inactiveCount: asNumber(followUp.inactiveCount, "reports.followUpStatus.inactiveCount"),
        coveragePercent: asNumber(followUp.coveragePercent, "reports.followUpStatus.coveragePercent"),
      },
      activityRanking: ranking.map((item, index) => {
        const activity = asRecord(item, `reports.activityRanking[${index}]`);
        return {
          activityId: asString(activity.activityId, `reports.activityRanking[${index}].activityId`),
          activityName: asString(activity.activityName, `reports.activityRanking[${index}].activityName`),
          communityLabel: asString(
            activity.communityLabel,
            `reports.activityRanking[${index}].communityLabel`
          ),
          registrationCount: asNumber(
            activity.registrationCount,
            `reports.activityRanking[${index}].registrationCount`
          ),
        };
      }),
      leadGrowth: {
        newLeadsInPeriod: asNumber(growth.newLeadsInPeriod, "reports.leadGrowth.newLeadsInPeriod"),
        totalLeadsAtEnd: asNumber(growth.totalLeadsAtEnd, "reports.leadGrowth.totalLeadsAtEnd"),
        totalLeadsBeforePeriod: asNumber(
          growth.totalLeadsBeforePeriod,
          "reports.leadGrowth.totalLeadsBeforePeriod"
        ),
      },
      communityRanking: communities.map((item, index) => {
        const community = asRecord(item, `reports.communityRanking[${index}]`);
        return {
          communityLabel: asString(
            community.communityLabel,
            `reports.communityRanking[${index}].communityLabel`
          ),
          registrationCount: asNumber(
            community.registrationCount,
            `reports.communityRanking[${index}].registrationCount`
          ),
        };
      }),
      repeatParticipants: asNumber(reports.repeatParticipants, "reports.repeatParticipants"),
      inactiveClients: asNumber(reports.inactiveClients, "reports.inactiveClients"),
      campaignResults: {
        available: asBoolean(campaignResults.available, "reports.campaignResults.available"),
        campaignsSent: asNumber(campaignResults.campaignsSent, "reports.campaignResults.campaignsSent"),
        campaignsFailed: asNumber(
          campaignResults.campaignsFailed,
          "reports.campaignResults.campaignsFailed"
        ),
      },
      priorPeriod: {
        startAt: asString(prior.startAt, "reports.priorPeriod.startAt"),
        endAt: asString(prior.endAt, "reports.priorPeriod.endAt"),
        registrations: asNumber(prior.registrations, "reports.priorPeriod.registrations"),
        newLeads: asNumber(prior.newLeads, "reports.priorPeriod.newLeads"),
        activitiesHosted: asNumber(prior.activitiesHosted, "reports.priorPeriod.activitiesHosted"),
        followUpCoveragePercent: asNumber(
          prior.followUpCoveragePercent,
          "reports.priorPeriod.followUpCoveragePercent"
        ),
      },
      dailyTrend: trend.map((item, index) => {
        const point = asRecord(item, `reports.dailyTrend[${index}]`);
        return {
          date: asString(point.date, `reports.dailyTrend[${index}].date`),
          registrations: asNumber(point.registrations, `reports.dailyTrend[${index}].registrations`),
          newClients: asNumber(point.newClients, `reports.dailyTrend[${index}].newClients`),
        };
      }),
    },
    website: parseWebsite(row.website),
  };
}

export function assertDemoClubInvariants(club: MarketingDemoClub): void {
  if (FORBIDDEN_ORG_PATTERN.test(club.orgName) || FORBIDDEN_ORG_PATTERN.test(club.publicHost)) {
    throw new Error("MarketingDemoClub: orgName/publicHost must not be Acme, Your account, or yourclub");
  }
  if (club.orgName !== DEMO_ORG_NAME) {
    throw new Error(`MarketingDemoClub: orgName must be ${DEMO_ORG_NAME}`);
  }
  if (club.clock.timeZoneId !== "Asia/Singapore") {
    throw new Error("MarketingDemoClub: clock.timeZoneId must be Asia/Singapore");
  }
  if (club.clock.demoNow !== "2026-09-07T09:00:00+08:00") {
    throw new Error("MarketingDemoClub: clock.demoNow must be 2026-09-07T09:00:00+08:00");
  }

  const names = club.clients.map((client) => client.fullName);
  for (const required of ["Maya Santos", "Daniel Koh", "Priya Nair", "Marcus Ong", "Sarah Tan"]) {
    if (!names.includes(required)) {
      throw new Error(`MarketingDemoClub: ${required} is required`);
    }
  }
  if (club.clients.length < 25) {
    throw new Error("MarketingDemoClub: need at least 25 visible clients");
  }

  const activityBlob = [
    ...club.clients.map((client) => client.lastActivityName ?? ""),
    ...club.dashboard.activityPerformance.map((row) => row.activityName),
    ...club.website.upcomingActivities.map((row) => row.name),
    ...club.activities.map((row) => row.name),
    club.whatsappQuote.body,
  ]
    .join(" ")
    .toLowerCase();

  if (
    !activityBlob.includes("golden hour") ||
    !activityBlob.includes("board game") ||
    !activityBlob.includes("pickleball")
  ) {
    throw new Error("MarketingDemoClub: Golden Hour Run, Board Game Night, and Sunday Pickleball are required");
  }

  if (!club.clients.some((client) => client.id === club.selectedClientId)) {
    throw new Error("MarketingDemoClub: selectedClientId must exist in clients");
  }
  if (!club.clients.some((client) => client.id === club.followUpClientId)) {
    throw new Error("MarketingDemoClub: followUpClientId must exist in clients");
  }

  const requiredDetailIds = new Set([
    club.selectedClientId,
    club.followUpClientId,
    ...club.reportsProofClientIds,
    ...Object.values(ANCHOR_IDS),
  ]);
  for (const id of requiredDetailIds) {
    const detail = club.clientDetails[id];
    if (!detail) {
      throw new Error(`MarketingDemoClub: clientDetails.${id} missing`);
    }
    const client = club.clients.find((row) => row.id === id);
    if (!client) {
      throw new Error(`MarketingDemoClub: clientDetails.${id} has no matching clients row`);
    }
    if (detail.id !== id || detail.fullName !== client.fullName) {
      throw new Error(`MarketingDemoClub: clientDetails.${id} identity mismatch`);
    }
    if (detail.timeline.length === 0) {
      throw new Error(`MarketingDemoClub: clientDetails.${id}.timeline empty`);
    }
  }

  const spots = getGoldenHourSpots(club);
  if (spots.going !== 34 || spots.capacity !== 42 || spots.spotsLeft !== 8) {
    throw new Error(
      `MarketingDemoClub: Golden Hour must be 34/42 (8 spots left); got ${spots.going}/${spots.capacity}`
    );
  }

  const attention = countNeedAttention(club);
  if (
    attention.dueNow !== 6 ||
    attention.atRisk !== 7 ||
    attention.opportunity !== 4 ||
    attention.total !== 17
  ) {
    throw new Error(
      `MarketingDemoClub: needsAttention must be dueNow6/atRisk7/opportunity4/total17; got ${JSON.stringify(attention)}`
    );
  }

  if (canRecommendWhatsApp(club, ANCHOR_IDS.marcus)) {
    throw new Error("MarketingDemoClub: Marcus must not be WhatsApp-eligible");
  }
  if (getTriageBucket(club, ANCHOR_IDS.marcus) !== "healthy") {
    throw new Error("MarketingDemoClub: Marcus incompleteness must not inflate needsAttention");
  }

  for (const room of REQUIRED_DEMO_ROOMS) {
    if (!club.availableRooms.includes(room)) {
      throw new Error(`MarketingDemoClub: availableRooms must include ${room}`);
    }
  }

  if (club.dashboardQueueIds.length === 0) {
    throw new Error("MarketingDemoClub: dashboardQueueIds must not be empty");
  }
  for (const id of club.dashboardQueueIds) {
    if (!club.clients.some((client) => client.id === id)) {
      throw new Error(`MarketingDemoClub: dashboardQueueId ${id} missing from clients`);
    }
  }

  if (club.campaigns.length === 0) {
    throw new Error("MarketingDemoClub: campaigns must not be empty");
  }
  if (club.reports.activityRanking.length === 0) {
    throw new Error("MarketingDemoClub: activityRanking must not be empty");
  }
  const rankingNames = club.reports.activityRanking
    .map((row) => row.activityName.toLowerCase())
    .join(" ");
  if (!rankingNames.includes("golden hour") || !rankingNames.includes("board game")) {
    throw new Error("MarketingDemoClub: activityRanking missing locked activities");
  }

  const briefs = getIntelligenceBriefs(club);
  if (briefs.length < 2) {
    throw new Error("MarketingDemoClub: intelligence briefs must include due-now and capacity");
  }
  const briefBlob = briefs.map((brief) => `${brief.title} ${brief.why.join(" ")}`).join("\n");
  if (/\d+%\s*(increase|improvement|lift|growth)/i.test(briefBlob)) {
    throw new Error("MarketingDemoClub: intelligence briefs must not invent percentage lifts");
  }
  if (!briefBlob.includes(String(attention.dueNow)) || !briefBlob.includes("34")) {
    throw new Error("MarketingDemoClub: intelligence briefs must cite due-now and Golden Hour 34");
  }

  for (const client of club.clients) {
    if (client.email && !client.email.toLowerCase().endsWith("@example.com")) {
      throw new Error(`MarketingDemoClub: clients.${client.id} email must be @example.com`);
    }
  }
  for (const [id, detail] of Object.entries(club.clientDetails)) {
    if (detail.email && !detail.email.toLowerCase().endsWith("@example.com")) {
      throw new Error(`MarketingDemoClub: clientDetails.${id} email must be @example.com`);
    }
  }

  if (club.whatsappQuote.clientId !== club.followUpClientId) {
    throw new Error("MarketingDemoClub: WhatsApp quote must belong to the follow-up client");
  }
  if (!club.whatsappQuote.body.toLowerCase().includes("golden hour")) {
    throw new Error("MarketingDemoClub: WhatsApp quote must mention Golden Hour");
  }

  const proof = getReportsProofClients(club);
  if (!proof.some((client) => client.fullName === "Maya Santos")) {
    throw new Error("MarketingDemoClub: Maya must appear in reports-derived proof clients");
  }

  const upcomingNames = club.website.upcomingActivities.map((row) => row.name.toLowerCase());
  if (!upcomingNames.some((name) => name.includes("golden hour"))) {
    throw new Error("MarketingDemoClub: upcomingActivities missing Golden Hour Run");
  }
  if (!upcomingNames.some((name) => name.includes("board game"))) {
    throw new Error("MarketingDemoClub: upcomingActivities missing Board Game Night");
  }

  if (isForbiddenDemoAssetRef(club.website.published.logoAssetId)) {
    throw new Error("MarketingDemoClub: remote logoAssetId forbidden");
  }
  if (
    club.website.upcomingActivities.some((activity) =>
      isForbiddenDemoAssetRef(activity.heroImageUrl)
    )
  ) {
    throw new Error("MarketingDemoClub: remote heroImageUrl forbidden");
  }

  for (const type of ["hero", "highlights", "upcomingactivities", "testimonials", "footer"]) {
    const enabled = club.website.published.sections.some(
      (section) => section.enabled && section.type.toLowerCase() === type
    );
    if (!enabled) {
      throw new Error(`MarketingDemoClub: website is missing enabled section type ${type}`);
    }
  }

  for (const section of club.website.published.sections) {
    if (!section.enabled) {
      continue;
    }
    const type = section.type.toLowerCase();
    if (!ALLOWED_WEBSITE_SECTION_TYPES.has(type)) {
      throw new Error(`MarketingDemoClub: unsupported enabled section type ${section.type}`);
    }
    const heroImageAssetId = section.props.heroImageAssetId;
    if (heroImageAssetId != null) {
      if (typeof heroImageAssetId !== "string") {
        throw new Error("MarketingDemoClub: heroImageAssetId must be string/null");
      }
      if (isForbiddenDemoAssetRef(heroImageAssetId)) {
        throw new Error("MarketingDemoClub: remote heroImageAssetId forbidden");
      }
    }
    const heroImageUrl = section.props.heroImageUrl;
    if (heroImageUrl != null) {
      if (typeof heroImageUrl !== "string") {
        throw new Error("MarketingDemoClub: heroImageUrl must be string/null");
      }
      if (isForbiddenDemoAssetRef(heroImageUrl)) {
        throw new Error("MarketingDemoClub: remote heroImageUrl forbidden");
      }
    }
    const items = Array.isArray(section.props.items) ? section.props.items : [];
    if (type === "highlights") {
      const hasTitle = items.some((item) => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const title = (item as Record<string, unknown>).title;
        return typeof title === "string" && title.trim().length > 0;
      });
      if (!hasTitle) {
        throw new Error("MarketingDemoClub: highlights items empty");
      }
    }
    if (type === "testimonials") {
      const hasQuote = items.some((item) => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const quote = (item as Record<string, unknown>).quote;
        return typeof quote === "string" && quote.trim().length > 0;
      });
      if (!hasQuote) {
        throw new Error("MarketingDemoClub: testimonials items empty");
      }
    }
    for (const item of items) {
      if (typeof item !== "object" || item === null) {
        continue;
      }
      const row = item as Record<string, unknown>;
      const avatarAssetId = row.avatarAssetId;
      if (avatarAssetId != null) {
        if (typeof avatarAssetId !== "string") {
          throw new Error("MarketingDemoClub: avatarAssetId must be string/null");
        }
        if (isForbiddenDemoAssetRef(avatarAssetId)) {
          throw new Error("MarketingDemoClub: remote avatarAssetId forbidden");
        }
      }
    }
  }
}

export function getFollowUpClient(club: MarketingDemoClub): DemoClientRow {
  const client = club.clients.find((row) => row.id === club.followUpClientId);
  if (!client) {
    throw new Error("MarketingDemoClub: follow-up client missing");
  }
  return client;
}

export function getSelectedClient(club: MarketingDemoClub): DemoClientRow {
  const client = club.clients.find((row) => row.id === club.selectedClientId);
  if (!client) {
    throw new Error("MarketingDemoClub: selected client missing");
  }
  return client;
}

export function getClientDetail(club: MarketingDemoClub, id: string): ClientDetail {
  const detail = club.clientDetails[id];
  if (!detail) {
    throw new Error(`MarketingDemoClub: clientDetails.${id} missing`);
  }
  return detail;
}

export function getReportsProofClients(club: MarketingDemoClub): DemoClientRow[] {
  return club.reportsProofClientIds.map((id) => {
    const client = club.clients.find((row) => row.id === id);
    if (!client) {
      throw new Error(`MarketingDemoClub: reportsProofClientId ${id} missing`);
    }
    return client;
  });
}

export function getDashboardQueue(club: MarketingDemoClub): DemoClientRow[] {
  return club.dashboardQueueIds.map((id) => {
    const client = club.clients.find((row) => row.id === id);
    if (!client) {
      throw new Error(`MarketingDemoClub: dashboardQueueId ${id} missing`);
    }
    return client;
  });
}

export function clientMetaLine(client: DemoClientRow): string {
  const nationality = client.nationality ?? "—";
  const activity = client.lastActivityName ?? "activity";
  return `${nationality} · ${activity} · ${client.relativeLabel}`;
}

export const marketingDemoClub = parseMarketingDemoClub(rawClub);
assertDemoClubInvariants(marketingDemoClub);

export function isDemoRoomAvailable(
  room: DemoRoomId,
  club: MarketingDemoClub = marketingDemoClub
): boolean {
  return club.availableRooms.includes(room);
}
