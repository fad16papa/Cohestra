import { getPublicApiBaseUrl } from "@/lib/api";

export type LeadStatus = "new" | "contacted" | "active" | "inactive";

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  active: "Active",
  inactive: "Inactive",
};

export const leadStatusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: leadStatusLabels.new },
  { value: "contacted", label: leadStatusLabels.contacted },
  { value: "active", label: leadStatusLabels.active },
  { value: "inactive", label: leadStatusLabels.inactive },
];

export type ClientSortBy = "name" | "status" | "lastRegistrationDate";

export type OutreachKind = "whatsapp" | "viber" | "email";

export type ClientLeadStatusCounts = {
  newCount: number;
  contactedCount: number;
  activeCount: number;
  inactiveCount: number;
  mergeSuspectCount: number;
  followUpDueCount: number;
};

export type ClientListItem = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  consentGiven: boolean;
  nationality: string | null;
  leadStatus: LeadStatus;
  lastRegistrationAt: string | null;
  lastActivityName: string | null;
  lastOutreachAt: string | null;
  lastOutreachKind: OutreachKind | null;
  nextFollowUpAt: string | null;
};

export type ClientListResult = {
  items: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  statusCounts: ClientLeadStatusCounts;
};

export type ClientRegistrationAnswer = {
  fieldId: string;
  label: string;
  value: string | null;
};

export type ClientRegistrationHistoryItem = {
  registrationId: string;
  registrationNumber: string;
  activityId: string;
  activityName: string;
  registeredAt: string;
  answers: ClientRegistrationAnswer[];
};

export type ClientDetail = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  profession: string | null;
  nationality: string | null;
  residency: string | null;
  consentGiven: boolean;
  referralSource: string | null;
  notes: string | null;
  leadStatus: LeadStatus;
  isMergeSuspect: boolean;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  registrationHistory: ClientRegistrationHistoryItem[];
  timeline: ClientTimelineItem[];
};

export type ClientTimelineEventType =
  | "registration_submitted"
  | "lead_status_changed"
  | "email_campaign_sent"
  | "whatsapp_initiated"
  | "whatsapp_follow_up_recorded"
  | "viber_initiated"
  | "next_follow_up_changed";

export type ClientTimelineItem = {
  eventType: ClientTimelineEventType;
  occurredAt: string;
  label: string;
  activityName: string | null;
  referralSource: string | null;
  previousLeadStatus: LeadStatus | null;
  newLeadStatus: LeadStatus | null;
  registrationId: string | null;
  campaignSubject: string | null;
  note: string | null;
};

function parseLeadStatus(raw: unknown): LeadStatus {
  if (raw === "new" || raw === "contacted" || raw === "active" || raw === "inactive") {
    return raw;
  }

  throw new Error("Invalid lead status");
}

export function parseClientListItem(raw: Record<string, unknown>): ClientListItem {
  const id = raw.id ?? raw.Id;
  const fullName = raw.fullName ?? raw.FullName;
  const phone = raw.phone ?? raw.Phone;
  const email = raw.email ?? raw.Email;
  const consentGiven = raw.consentGiven ?? raw.ConsentGiven;
  const nationality = raw.nationality ?? raw.Nationality;
  const leadStatus = raw.leadStatus ?? raw.LeadStatus;
  const lastRegistrationAt = raw.lastRegistrationAt ?? raw.LastRegistrationAt;
  const lastActivityName = raw.lastActivityName ?? raw.LastActivityName;
  const lastOutreachAt = raw.lastOutreachAt ?? raw.LastOutreachAt;
  const lastOutreachKind = raw.lastOutreachKind ?? raw.LastOutreachKind;
  const nextFollowUpAt = raw.nextFollowUpAt ?? raw.NextFollowUpAt;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof fullName !== "string"
  ) {
    throw new Error("Invalid client list item payload");
  }

  return {
    id: String(id),
    fullName,
    phone: typeof phone === "string" ? phone : null,
    email: typeof email === "string" ? email : null,
    consentGiven: Boolean(consentGiven),
    nationality: typeof nationality === "string" ? nationality : null,
    leadStatus: parseLeadStatus(leadStatus),
    lastRegistrationAt:
      typeof lastRegistrationAt === "string" ? lastRegistrationAt : null,
    lastActivityName:
      typeof lastActivityName === "string" ? lastActivityName : null,
    lastOutreachAt:
      typeof lastOutreachAt === "string" ? lastOutreachAt : null,
    lastOutreachKind: parseOutreachKind(lastOutreachKind),
    nextFollowUpAt:
      typeof nextFollowUpAt === "string" ? nextFollowUpAt : null,
  };
}

function parseOutreachKind(raw: unknown): OutreachKind | null {
  if (raw === "whatsapp" || raw === "viber" || raw === "email") {
    return raw;
  }

  return null;
}

function parseClientLeadStatusCounts(
  raw: Record<string, unknown> | undefined
): ClientLeadStatusCounts {
  if (!raw) {
    return {
      newCount: 0,
      contactedCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      mergeSuspectCount: 0,
      followUpDueCount: 0,
    };
  }

  const newCount = raw.newCount ?? raw.NewCount;
  const contactedCount = raw.contactedCount ?? raw.ContactedCount;
  const activeCount = raw.activeCount ?? raw.ActiveCount;
  const inactiveCount = raw.inactiveCount ?? raw.InactiveCount;
  const mergeSuspectCount = raw.mergeSuspectCount ?? raw.MergeSuspectCount;
  const followUpDueCount = raw.followUpDueCount ?? raw.FollowUpDueCount;

  return {
    newCount: typeof newCount === "number" ? newCount : 0,
    contactedCount: typeof contactedCount === "number" ? contactedCount : 0,
    activeCount: typeof activeCount === "number" ? activeCount : 0,
    inactiveCount: typeof inactiveCount === "number" ? inactiveCount : 0,
    mergeSuspectCount:
      typeof mergeSuspectCount === "number" ? mergeSuspectCount : 0,
    followUpDueCount:
      typeof followUpDueCount === "number" ? followUpDueCount : 0,
  };
}

export function parseClientList(raw: Record<string, unknown>): ClientListResult {
  const items = raw.items ?? raw.Items;
  const page = raw.page ?? raw.Page;
  const pageSize = raw.pageSize ?? raw.PageSize;
  const totalCount = raw.totalCount ?? raw.TotalCount;
  const statusCounts = raw.statusCounts ?? raw.StatusCounts;

  if (
    !Array.isArray(items) ||
    typeof page !== "number" ||
    typeof pageSize !== "number" ||
    typeof totalCount !== "number"
  ) {
    throw new Error("Invalid client list payload");
  }

  return {
    items: items.map((item) =>
      parseClientListItem(item as Record<string, unknown>)
    ),
    page,
    pageSize,
    totalCount,
    statusCounts: parseClientLeadStatusCounts(
      statusCounts as Record<string, unknown> | undefined
    ),
  };
}

async function parseProblemDetail(response: Response): Promise<string> {
  try {
    const raw = (await response.json()) as Record<string, unknown>;
    const detail = raw.detail ?? raw.Detail;
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
  } catch {
    // fall through
  }

  return `Request failed (${response.status})`;
}

export async function fetchClients(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: ClientSortBy;
    sortDirection?: "asc" | "desc";
    mergeSuspect?: boolean;
    createdWithinDays?: number;
    registeredWithinDays?: number;
    followUpDue?: boolean;
    withoutOutreach?: boolean;
    leadStatus?: LeadStatus;
    nationality?: string;
    search?: string;
    community?: string;
    consentOnly?: boolean;
    excludeCommunity?: string;
    activityId?: string;
  } = {}
): Promise<ClientListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortDirection) {
    searchParams.set("sortDirection", params.sortDirection);
  }

  if (params.mergeSuspect === true) {
    searchParams.set("mergeSuspect", "true");
  }

  if (params.createdWithinDays && params.createdWithinDays > 0) {
    searchParams.set("createdWithinDays", String(params.createdWithinDays));
  }

  if (params.registeredWithinDays && params.registeredWithinDays > 0) {
    searchParams.set("registeredWithinDays", String(params.registeredWithinDays));
  }

  if (params.followUpDue === true) {
    searchParams.set("followUpDue", "true");
  }

  if (params.withoutOutreach === true) {
    searchParams.set("withoutOutreach", "true");
  }

  if (params.leadStatus) {
    searchParams.set("leadStatus", params.leadStatus);
  }

  if (params.nationality?.trim()) {
    searchParams.set("nationality", params.nationality.trim());
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.community?.trim()) {
    searchParams.set("community", params.community.trim());
  }

  if (params.consentOnly === true) {
    searchParams.set("consentOnly", "true");
  }

  if (params.excludeCommunity?.trim()) {
    searchParams.set("excludeCommunity", params.excludeCommunity.trim());
  }

  if (params.activityId?.trim()) {
    searchParams.set("activityId", params.activityId.trim());
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseClientList(raw);
}

export async function fetchClientNationalities(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/nationalities`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error("Invalid client nationalities payload");
  }

  return raw.filter((value): value is string => typeof value === "string");
}

function parseClientRegistrationAnswer(
  raw: Record<string, unknown>
): ClientRegistrationAnswer {
  const fieldId = raw.fieldId ?? raw.FieldId;
  const label = raw.label ?? raw.Label;
  const value = raw.value ?? raw.Value;

  if (typeof fieldId !== "string" || typeof label !== "string") {
    throw new Error("Invalid client registration answer payload");
  }

  return {
    fieldId,
    label,
    value: typeof value === "string" ? value : null,
  };
}

function parseClientRegistrationHistoryItem(
  raw: Record<string, unknown>
): ClientRegistrationHistoryItem {
  const registrationId = raw.registrationId ?? raw.RegistrationId;
  const registrationNumber = raw.registrationNumber ?? raw.RegistrationNumber;
  const activityId = raw.activityId ?? raw.ActivityId;
  const activityName = raw.activityName ?? raw.ActivityName;
  const registeredAt = raw.registeredAt ?? raw.RegisteredAt;
  const answers = raw.answers ?? raw.Answers;

  if (
    typeof registrationId !== "string" ||
    typeof registrationNumber !== "string" ||
    typeof activityId !== "string" ||
    typeof activityName !== "string" ||
    typeof registeredAt !== "string" ||
    !Array.isArray(answers)
  ) {
    throw new Error("Invalid client registration history payload");
  }

  return {
    registrationId,
    registrationNumber,
    activityId,
    activityName,
    registeredAt,
    answers: answers.map((answer) =>
      parseClientRegistrationAnswer(answer as Record<string, unknown>)
    ),
  };
}

function parseTimelineEventType(raw: unknown): ClientTimelineEventType {
  if (
    raw === "registration_submitted" ||
    raw === "lead_status_changed" ||
    raw === "email_campaign_sent" ||
    raw === "whatsapp_initiated" ||
    raw === "whatsapp_follow_up_recorded" ||
    raw === "viber_initiated" ||
    raw === "next_follow_up_changed"
  ) {
    return raw;
  }

  throw new Error("Invalid client timeline event type");
}

function parseOptionalLeadStatus(raw: unknown): LeadStatus | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized === "new" ||
      normalized === "contacted" ||
      normalized === "active" ||
      normalized === "inactive"
    ) {
      return normalized;
    }
  }

  throw new Error("Invalid lead status");
}

function parseClientTimelineItem(raw: Record<string, unknown>): ClientTimelineItem {
  const eventType = raw.eventType ?? raw.EventType;
  const occurredAt = raw.occurredAt ?? raw.OccurredAt;
  const label = raw.label ?? raw.Label;
  const activityName = raw.activityName ?? raw.ActivityName;
  const referralSource = raw.referralSource ?? raw.ReferralSource;
  const previousLeadStatus = raw.previousLeadStatus ?? raw.PreviousLeadStatus;
  const newLeadStatus = raw.newLeadStatus ?? raw.NewLeadStatus;
  const registrationId = raw.registrationId ?? raw.RegistrationId;
  const campaignSubject = raw.campaignSubject ?? raw.CampaignSubject;
  const note = raw.note ?? raw.Note;

  if (
    typeof occurredAt !== "string" ||
    typeof label !== "string"
  ) {
    throw new Error("Invalid client timeline item payload");
  }

  return {
    eventType: parseTimelineEventType(eventType),
    occurredAt,
    label,
    activityName: typeof activityName === "string" ? activityName : null,
    referralSource: typeof referralSource === "string" ? referralSource : null,
    previousLeadStatus: parseOptionalLeadStatus(previousLeadStatus),
    newLeadStatus: parseOptionalLeadStatus(newLeadStatus),
    registrationId: typeof registrationId === "string" ? registrationId : null,
    campaignSubject: typeof campaignSubject === "string" ? campaignSubject : null,
    note: typeof note === "string" ? note : null,
  };
}

function parseClientDetail(raw: Record<string, unknown>): ClientDetail {
  const id = raw.id ?? raw.Id;
  const fullName = raw.fullName ?? raw.FullName;
  const phone = raw.phone ?? raw.Phone;
  const email = raw.email ?? raw.Email;
  const profession = raw.profession ?? raw.Profession;
  const nationality = raw.nationality ?? raw.Nationality;
  const residency = raw.residency ?? raw.Residency;
  const consentGiven = raw.consentGiven ?? raw.ConsentGiven;
  const referralSource = raw.referralSource ?? raw.ReferralSource;
  const notes = raw.notes ?? raw.Notes;
  const leadStatus = raw.leadStatus ?? raw.LeadStatus;
  const isMergeSuspect = raw.isMergeSuspect ?? raw.IsMergeSuspect;
  const nextFollowUpAt = raw.nextFollowUpAt ?? raw.NextFollowUpAt;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;
  const registrationHistory = raw.registrationHistory ?? raw.RegistrationHistory;
  const timeline = raw.timeline ?? raw.Timeline;

  if (
    typeof id !== "string" ||
    typeof fullName !== "string" ||
    typeof consentGiven !== "boolean" ||
    typeof isMergeSuspect !== "boolean" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    !Array.isArray(registrationHistory) ||
    !Array.isArray(timeline)
  ) {
    throw new Error("Invalid client detail payload");
  }

  return {
    id,
    fullName,
    phone: typeof phone === "string" ? phone : null,
    email: typeof email === "string" ? email : null,
    profession: typeof profession === "string" ? profession : null,
    nationality: typeof nationality === "string" ? nationality : null,
    residency: typeof residency === "string" ? residency : null,
    consentGiven,
    referralSource: typeof referralSource === "string" ? referralSource : null,
    notes: typeof notes === "string" ? notes : null,
    leadStatus: parseLeadStatus(leadStatus),
    isMergeSuspect,
    nextFollowUpAt:
      typeof nextFollowUpAt === "string" ? nextFollowUpAt : null,
    createdAt,
    updatedAt,
    registrationHistory: registrationHistory.map((entry) =>
      parseClientRegistrationHistoryItem(entry as Record<string, unknown>)
    ),
    timeline: timeline.map((entry) =>
      parseClientTimelineItem(entry as Record<string, unknown>)
    ),
  };
}

export async function fetchClientById(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}`
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseClientDetail(raw);
}

export type UpdateClientMasterProfilePayload = {
  fullName: string;
  phone?: string | null;
  phoneCountry?: string | null;
  email?: string | null;
  profession?: string | null;
  nationality?: string | null;
  residency?: string | null;
  consentGiven: boolean;
  referralSource?: string | null;
  notes?: string | null;
};

export async function updateClientMasterProfile(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  payload: UpdateClientMasterProfilePayload
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/master-profile`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseClientDetail(raw);
}

export async function updateClientLeadStatus(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  leadStatus: LeadStatus
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/lead-status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leadStatus }),
    }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseClientDetail(raw);
}

export async function recordWhatsAppInitiated(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/whatsapp-initiated`,
    { method: "POST" }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseClientDetail((await response.json()) as Record<string, unknown>);
}

export async function recordViberInitiated(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/viber-initiated`,
    { method: "POST" }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseClientDetail((await response.json()) as Record<string, unknown>);
}

export async function recordWhatsAppFollowUp(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  payload: { status: "contacted" | "awaiting_reply"; note?: string }
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/whatsapp-follow-up`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseClientDetail((await response.json()) as Record<string, unknown>);
}

export function formatLastActivityName(client: ClientListItem): string {
  return client.lastActivityName?.trim() || "No registrations yet";
}

export function formatLastActivityDate(client: ClientListItem): string | null {
  if (!client.lastRegistrationAt) {
    return null;
  }

  const registeredAt = new Date(client.lastRegistrationAt);
  if (Number.isNaN(registeredAt.getTime())) {
    return null;
  }

  const now = new Date();
  const sameYear = registeredAt.getFullYear() === now.getFullYear();

  return registeredAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
  });
}

export function formatLastActivityCaption(client: ClientListItem): string {
  const name = formatLastActivityName(client);
  const date = formatLastActivityDate(client);

  if (!client.lastActivityName) {
    return name;
  }

  if (!date) {
    return name;
  }

  return `${name} · ${date}`;
}

const outreachKindLabels: Record<OutreachKind, string> = {
  whatsapp: "WhatsApp",
  viber: "Viber",
  email: "Email",
};

export async function updateClientNextFollowUp(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  nextFollowUpDate: string | null
): Promise<ClientDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/${id}/next-follow-up`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextFollowUpDate }),
    }
  );

  if (response.status === 404) {
    throw new Error("Client not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseClientDetail((await response.json()) as Record<string, unknown>);
}

export type ClientCsvExportResult = {
  blob: Blob;
  fileName: string;
  rowCount: number;
};

function parseContentDispositionFileName(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const match = /filename="?([^";\n]+)"?/i.exec(contentDisposition);
  return match?.[1]?.trim() ?? null;
}

export async function exportClientsCsv(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  params: {
    sortBy?: ClientSortBy;
    sortDirection?: "asc" | "desc";
    mergeSuspect?: boolean;
    createdWithinDays?: number;
    registeredWithinDays?: number;
    followUpDue?: boolean;
    leadStatus?: LeadStatus;
    nationality?: string;
    search?: string;
    community?: string;
    consentOnly?: boolean;
    excludeCommunity?: string;
  } = {}
): Promise<ClientCsvExportResult> {
  const searchParams = new URLSearchParams();

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortDirection) {
    searchParams.set("sortDirection", params.sortDirection);
  }

  if (params.mergeSuspect === true) {
    searchParams.set("mergeSuspect", "true");
  }

  if (params.createdWithinDays && params.createdWithinDays > 0) {
    searchParams.set("createdWithinDays", String(params.createdWithinDays));
  }

  if (params.registeredWithinDays && params.registeredWithinDays > 0) {
    searchParams.set("registeredWithinDays", String(params.registeredWithinDays));
  }

  if (params.followUpDue === true) {
    searchParams.set("followUpDue", "true");
  }

  if (params.leadStatus) {
    searchParams.set("leadStatus", params.leadStatus);
  }

  if (params.nationality?.trim()) {
    searchParams.set("nationality", params.nationality.trim());
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.community?.trim()) {
    searchParams.set("community", params.community.trim());
  }

  if (params.consentOnly === true) {
    searchParams.set("consentOnly", "true");
  }

  if (params.excludeCommunity?.trim()) {
    searchParams.set("excludeCommunity", params.excludeCommunity.trim());
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/clients/export.csv?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const blob = await response.blob();
  const rowCountHeader = response.headers.get("X-Client-Row-Count");
  const rowCount = rowCountHeader ? Number.parseInt(rowCountHeader, 10) : 0;
  const fileName =
    parseContentDispositionFileName(response.headers.get("Content-Disposition")) ??
    "clients-export.csv";

  return {
    blob,
    fileName,
    rowCount: Number.isFinite(rowCount) ? rowCount : 0,
  };
}

export function downloadClientsCsvExport(exportResult: ClientCsvExportResult): void {
  const objectUrl = URL.createObjectURL(exportResult.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = exportResult.fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function formatLastOutreachCaption(client: ClientListItem): string {
  if (!client.lastOutreachAt || !client.lastOutreachKind) {
    return "Never";
  }

  const outreachAt = new Date(client.lastOutreachAt);
  if (Number.isNaN(outreachAt.getTime())) {
    return outreachKindLabels[client.lastOutreachKind];
  }

  const formattedDate = outreachAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${outreachKindLabels[client.lastOutreachKind]} · ${formattedDate}`;
}

export function formatClientContactLine(client: ClientListItem): string {
  if (client.phone) {
    return client.phone;
  }

  if (client.email) {
    return client.email;
  }

  return "No contact on file";
}

export function formatNextFollowUpDate(
  value: string | null,
  timeZoneId?: string | null
): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  try {
    return date.toLocaleDateString(undefined, {
      timeZone: timeZoneId ?? undefined,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

export function isFollowUpDue(
  nextFollowUpAt: string | null,
  timeZoneId?: string | null
): boolean {
  if (!nextFollowUpAt) {
    return false;
  }

  const followUpDate = new Date(nextFollowUpAt);
  if (Number.isNaN(followUpDate.getTime())) {
    return false;
  }

  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayKey = formatter.format(now);
    const followUpKey = formatter.format(followUpDate);

    return followUpKey <= todayKey;
  } catch {
    return false;
  }
}
