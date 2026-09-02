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
  | "clients"
  | "outreach"
  | "dashboard"
  | "campaigns"
  | "reports"
  | "website";

export type DemoWhatsappQuote = {
  clientId: string;
  body: string;
  loggedAt: string;
};

export type DemoClientRow = ClientListItem & {
  relativeLabel: string;
};

export type MarketingDemoClub = {
  orgName: string;
  publicHost: string;
  operatorGreeting: string;
  selectedClientId: string;
  followUpClientId: string;
  availableRooms: DemoRoomId[];
  reportsProofClientIds: string[];
  clientListTotalCount: number;
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

const LEAD_STATUSES = new Set<LeadStatus>(["new", "contacted", "active", "inactive"]);
const OUTREACH_KINDS = new Set<OutreachKind>(["whatsapp", "viber", "email"]);
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
  "clients",
  "outreach",
  "dashboard",
  "campaigns",
  "reports",
  "website",
];
const ROOMS = new Set<DemoRoomId>(REQUIRED_DEMO_ROOMS);

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
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`MarketingDemoClub: ${label} must be a number`);
  }
  return value;
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
        status: asString(activity.status, `dashboard.activityPerformance[${index}].status`) as ActivityStatus,
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
          typeof section.props === "object" && section.props !== null
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
      preset: asString(filters.preset, "reportFilters.preset") as ReportPreset,
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
        preset: asString(period.preset, "reports.period.preset"),
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

  const names = club.clients.map((client) => client.fullName);
  if (!names.includes("Elena Martinez") || !names.includes("Jordan Kim")) {
    throw new Error("MarketingDemoClub: Elena Martinez and Jordan Kim are required");
  }

  const activityBlob = [
    ...club.clients.map((client) => client.lastActivityName ?? ""),
    ...club.dashboard.activityPerformance.map((row) => row.activityName),
    ...club.website.upcomingActivities.map((row) => row.name),
    club.whatsappQuote.body,
  ]
    .join(" ")
    .toLowerCase();

  if (!activityBlob.includes("sunday clinic") || !activityBlob.includes("board games")) {
    throw new Error("MarketingDemoClub: Sunday clinic and board games night are required");
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
  ]);
  for (const id of requiredDetailIds) {
    if (!club.clientDetails[id]) {
      throw new Error(`MarketingDemoClub: clientDetails.${id} missing`);
    }
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

  if (club.whatsappQuote.clientId !== club.followUpClientId) {
    throw new Error("MarketingDemoClub: WhatsApp quote must belong to the follow-up client");
  }
  if (!club.whatsappQuote.body.toLowerCase().includes("sunday clinic")) {
    throw new Error("MarketingDemoClub: WhatsApp quote must mention Sunday clinic");
  }

  const proof = getReportsProofClients(club);
  if (!proof.some((client) => client.fullName === "Elena Martinez")) {
    throw new Error("MarketingDemoClub: Elena must appear in reports-derived proof clients");
  }

  for (const type of ["hero", "highlights", "upcomingactivities", "testimonials"]) {
    const enabled = club.website.published.sections.some(
      (section) => section.enabled && section.type.toLowerCase() === type
    );
    if (!enabled) {
      throw new Error(`MarketingDemoClub: website is missing enabled section type ${type}`);
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
