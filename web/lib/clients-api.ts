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

export type ClientListItem = {
  id: string;
  fullName: string;
  email: string | null;
  consentGiven: boolean;
  nationality: string | null;
  leadStatus: LeadStatus;
  lastRegistrationAt: string | null;
  lastActivityName: string | null;
};

export type ClientListResult = {
  items: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
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
  | "whatsapp_follow_up_recorded";

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
  const email = raw.email ?? raw.Email;
  const consentGiven = raw.consentGiven ?? raw.ConsentGiven;
  const nationality = raw.nationality ?? raw.Nationality;
  const leadStatus = raw.leadStatus ?? raw.LeadStatus;
  const lastRegistrationAt = raw.lastRegistrationAt ?? raw.LastRegistrationAt;
  const lastActivityName = raw.lastActivityName ?? raw.LastActivityName;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof fullName !== "string"
  ) {
    throw new Error("Invalid client list item payload");
  }

  return {
    id: String(id),
    fullName,
    email: typeof email === "string" ? email : null,
    consentGiven: Boolean(consentGiven),
    nationality: typeof nationality === "string" ? nationality : null,
    leadStatus: parseLeadStatus(leadStatus),
    lastRegistrationAt:
      typeof lastRegistrationAt === "string" ? lastRegistrationAt : null,
    lastActivityName:
      typeof lastActivityName === "string" ? lastActivityName : null,
  };
}

function parseClientList(raw: Record<string, unknown>): ClientListResult {
  const items = raw.items ?? raw.Items;
  const page = raw.page ?? raw.Page;
  const pageSize = raw.pageSize ?? raw.PageSize;
  const totalCount = raw.totalCount ?? raw.TotalCount;

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
    leadStatus?: LeadStatus;
    nationality?: string;
    search?: string;
    community?: string;
    consentOnly?: boolean;
    excludeCommunity?: string;
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
    raw === "whatsapp_follow_up_recorded"
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

export function formatLastActivityCaption(client: ClientListItem): string {
  if (!client.lastActivityName) {
    return "No registrations yet";
  }

  if (!client.lastRegistrationAt) {
    return client.lastActivityName;
  }

  const registeredAt = new Date(client.lastRegistrationAt);
  if (Number.isNaN(registeredAt.getTime())) {
    return client.lastActivityName;
  }

  const formattedDate = registeredAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${client.lastActivityName} · ${formattedDate}`;
}
