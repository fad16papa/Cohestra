import { getPublicApiBaseUrl } from "@/lib/api";

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  bodyFormat: CampaignBodyFormat;
  createdAt: string;
  updatedAt: string;
};

export type ClientSegmentQuery = {
  activityIds?: string[];
  leadStatus?: string;
  community?: string;
  clientIds?: string[];
  additionalClientIds?: string[];
  name?: string;
  nationality?: string;
  profession?: string;
  consentOnly?: boolean;
  allClients?: boolean;
};

export const MAX_ADDITIONAL_CAMPAIGN_RECIPIENTS = 50;

function buildSegmentPayload(segment: ClientSegmentQuery) {
  return {
    activityIds: segment.activityIds,
    leadStatus: segment.leadStatus,
    community: segment.community,
    clientIds: segment.clientIds,
    additionalClientIds:
      segment.additionalClientIds && segment.additionalClientIds.length > 0
        ? segment.additionalClientIds
        : undefined,
    name: segment.name,
    nationality: segment.nationality,
    profession: segment.profession,
    consentOnly: segment.consentOnly ?? true,
    allClients: segment.allClients ?? false,
  };
}

function buildCampaignBodyPayload(body: string, bodyFormat: CampaignBodyFormat = "html") {
  return {
    body,
    bodyFormat,
  };
}

export const CAMPAIGN_SUBJECT_MAX_LENGTH = 200;
export const CAMPAIGN_BODY_MAX_LENGTH = 8000;
export const CAMPAIGN_HTML_MAX_BYTES = 102_400;

export type CampaignBodyFormat = "plain" | "html";

export type CampaignAsset = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  altText: string | null;
  url: string;
  createdAt: string;
};

export function isValidSegmentQuery(segment: ClientSegmentQuery): boolean {
  if (segment.allClients) {
    return true;
  }

  if (segment.clientIds?.length === 0 || segment.activityIds?.length === 0) {
    return false;
  }

  return Boolean(
    segment.allClients ||
      (segment.clientIds && segment.clientIds.length > 0) ||
      (segment.activityIds && segment.activityIds.length > 0) ||
      segment.leadStatus?.trim() ||
      segment.community?.trim() ||
      segment.name?.trim() ||
      segment.nationality?.trim() ||
      segment.profession?.trim()
  );
}

/** Compose flow requires a target community (consent-only segment). */
export function isComposeSegmentReady(segment: ClientSegmentQuery): boolean {
  return Boolean(segment.community?.trim()) && segment.consentOnly !== false;
}

export type ClientSegmentPreviewItem = {
  id: string;
  fullName: string;
  email: string | null;
  consentGiven: boolean;
  isAdditionalRecipient: boolean;
};

export type ClientSegmentPreview = {
  totalCount: number;
  withEmailCount: number;
  withoutEmailCount: number;
  withoutConsentCount: number;
  communityWithEmailCount: number;
  additionalWithEmailCount: number;
  previewItems: ClientSegmentPreviewItem[];
};

export type CampaignRecipientResult = {
  clientId: string;
  fullName: string;
  email: string | null;
  status: "sent" | "failed" | "skipped";
  failureReason: string | null;
};

export type SendCampaignResult = {
  campaignId: string;
  subject: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  results: CampaignRecipientResult[];
};

export type CampaignListItem = {
  id: string;
  subject: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  status: string;
};

export type CampaignListResult = {
  items: CampaignListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

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

function parseEmailTemplate(raw: Record<string, unknown>): EmailTemplate {
  const id = raw.id ?? raw.Id;
  const name = raw.name ?? raw.Name;
  const subject = raw.subject ?? raw.Subject;
  const body = raw.body ?? raw.Body;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;
  const bodyFormatRaw = raw.bodyFormat ?? raw.BodyFormat;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof subject !== "string" ||
    typeof body !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new Error("Invalid email template payload");
  }

  const bodyFormat =
    bodyFormatRaw === "html" || bodyFormatRaw === "plain"
      ? bodyFormatRaw
      : body.includes("<") && body.includes(">")
        ? "html"
        : "plain";

  return { id, name, subject, body, bodyFormat, createdAt, updatedAt };
}

export async function fetchEmailTemplates(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<EmailTemplate[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/email-templates`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const items = raw.items ?? raw.Items;
  if (!Array.isArray(items)) {
    throw new Error("Invalid email template list payload");
  }

  return items.map((item) => parseEmailTemplate(item as Record<string, unknown>));
}

export async function createEmailTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: { name: string; subject: string; body: string; bodyFormat?: CampaignBodyFormat }
): Promise<EmailTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/email-templates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        bodyFormat: payload.bodyFormat ?? "html",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseEmailTemplate((await response.json()) as Record<string, unknown>);
}

export async function updateEmailTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  payload: { name: string; subject: string; body: string; bodyFormat?: CampaignBodyFormat }
): Promise<EmailTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/email-templates/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        bodyFormat: payload.bodyFormat ?? "html",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseEmailTemplate((await response.json()) as Record<string, unknown>);
}

export async function deleteEmailTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/email-templates/${id}`,
    { method: "DELETE" }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(await parseProblemDetail(response));
  }
}

export async function previewClientSegment(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  segment: ClientSegmentQuery
): Promise<ClientSegmentPreview> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/segment/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSegmentPayload(segment)),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const previewItems = raw.previewItems ?? raw.PreviewItems;

  if (!Array.isArray(previewItems)) {
    throw new Error("Invalid segment preview payload");
  }

  return {
    totalCount: Number(raw.totalCount ?? raw.TotalCount ?? 0),
    withEmailCount: Number(raw.withEmailCount ?? raw.WithEmailCount ?? 0),
    withoutEmailCount: Number(raw.withoutEmailCount ?? raw.WithoutEmailCount ?? 0),
    withoutConsentCount: Number(raw.withoutConsentCount ?? raw.WithoutConsentCount ?? 0),
    communityWithEmailCount: Number(
      raw.communityWithEmailCount ?? raw.CommunityWithEmailCount ?? 0
    ),
    additionalWithEmailCount: Number(
      raw.additionalWithEmailCount ?? raw.AdditionalWithEmailCount ?? 0
    ),
    previewItems: previewItems.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? row.Id),
        fullName: String(row.fullName ?? row.FullName),
        email: typeof row.email === "string" ? row.email : typeof row.Email === "string" ? row.Email : null,
        consentGiven: Boolean(row.consentGiven ?? row.ConsentGiven),
        isAdditionalRecipient: Boolean(
          row.isAdditionalRecipient ?? row.IsAdditionalRecipient
        ),
      };
    }),
  };
}

export async function sendCampaign(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: {
    subject: string;
    body: string;
    bodyFormat?: CampaignBodyFormat;
    emailTemplateId?: string;
    segment: ClientSegmentQuery;
  }
): Promise<SendCampaignResult> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: payload.subject,
        ...buildCampaignBodyPayload(payload.body, payload.bodyFormat ?? "html"),
        emailTemplateId: payload.emailTemplateId ?? null,
        segment: buildSegmentPayload(payload.segment),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const results = raw.results ?? raw.Results;
  if (!Array.isArray(results)) {
    throw new Error("Invalid campaign send payload");
  }

  return {
    campaignId: String(raw.campaignId ?? raw.CampaignId),
    subject: String(raw.subject ?? raw.Subject),
    sentAt: String(raw.sentAt ?? raw.SentAt),
    sentCount: Number(raw.sentCount ?? raw.SentCount ?? 0),
    failedCount: Number(raw.failedCount ?? raw.FailedCount ?? 0),
    skippedCount: Number(raw.skippedCount ?? raw.SkippedCount ?? 0),
    results: results.map((item) => {
      const row = item as Record<string, unknown>;
      const status = row.status ?? row.Status;
      return {
        clientId: String(row.clientId ?? row.ClientId),
        fullName: String(row.fullName ?? row.FullName),
        email: typeof row.email === "string" ? row.email : typeof row.Email === "string" ? row.Email : null,
        status: status === "sent" || status === "failed" || status === "skipped" ? status : "failed",
        failureReason:
          typeof row.failureReason === "string"
            ? row.failureReason
            : typeof row.FailureReason === "string"
              ? row.FailureReason
              : null,
      };
    }),
  };
}

export async function fetchCampaigns(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  params: { page?: number; pageSize?: number } = {}
): Promise<CampaignListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const items = raw.items ?? raw.Items;
  if (!Array.isArray(items)) {
    throw new Error("Invalid campaign list payload");
  }

  return {
    items: items.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? row.Id),
        subject: String(row.subject ?? row.Subject),
        sentAt: String(row.sentAt ?? row.SentAt),
        sentCount: Number(row.sentCount ?? row.SentCount ?? 0),
        failedCount: Number(row.failedCount ?? row.FailedCount ?? 0),
        skippedCount: Number(row.skippedCount ?? row.SkippedCount ?? 0),
        status: String(row.status ?? row.Status),
      };
    }),
    page: Number(raw.page ?? raw.Page ?? 1),
    pageSize: Number(raw.pageSize ?? raw.PageSize ?? 25),
    totalCount: Number(raw.totalCount ?? raw.TotalCount ?? 0),
  };
}

export function formatCampaignSentAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type CampaignDetail = {
  id: string;
  subject: string;
  body: string;
  bodyFormat: CampaignBodyFormat;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  status: string;
  results: CampaignRecipientResult[];
};

function parseCampaignAsset(raw: Record<string, unknown>): CampaignAsset {
  return {
    id: String(raw.id ?? raw.Id),
    fileName: String(raw.fileName ?? raw.FileName),
    contentType: String(raw.contentType ?? raw.ContentType),
    sizeBytes: Number(raw.sizeBytes ?? raw.SizeBytes ?? 0),
    altText:
      typeof raw.altText === "string"
        ? raw.altText
        : typeof raw.AltText === "string"
          ? raw.AltText
          : null,
    url: String(raw.url ?? raw.Url),
    createdAt: String(raw.createdAt ?? raw.CreatedAt),
  };
}

export function getHtmlByteSize(html: string): number {
  return new TextEncoder().encode(html).length;
}

export async function uploadCampaignAsset(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  file: File,
  altText?: string
): Promise<CampaignAsset> {
  const formData = new FormData();
  formData.append("file", file);
  if (altText?.trim()) {
    formData.append("altText", altText.trim());
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/assets`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCampaignAsset((await response.json()) as Record<string, unknown>);
}

export async function createCampaignAssetFromActivityQr(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  activityId: string,
  altText?: string
): Promise<CampaignAsset> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/assets/from-activity-qr`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, altText: altText ?? null }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCampaignAsset((await response.json()) as Record<string, unknown>);
}

export async function sendTestCampaignEmail(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: { subject: string; body: string; bodyFormat?: CampaignBodyFormat }
): Promise<{ success: boolean; failureReason: string | null }> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/send-test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: payload.subject,
        ...buildCampaignBodyPayload(payload.body, payload.bodyFormat ?? "html"),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return {
    success: Boolean(raw.success ?? raw.Success),
    failureReason:
      typeof raw.failureReason === "string"
        ? raw.failureReason
        : typeof raw.FailureReason === "string"
          ? raw.FailureReason
          : null,
  };
}

export async function fetchCampaignById(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<CampaignDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/campaigns/${id}`
  );

  if (response.status === 404) {
    throw new Error("Campaign not found.");
  }

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const results = raw.results ?? raw.Results;
  if (!Array.isArray(results)) {
    throw new Error("Invalid campaign detail payload");
  }

  const bodyFormatRaw = raw.bodyFormat ?? raw.BodyFormat;

  return {
    id: String(raw.id ?? raw.Id),
    subject: String(raw.subject ?? raw.Subject),
    body: String(raw.body ?? raw.Body),
    bodyFormat:
      bodyFormatRaw === "html" || bodyFormatRaw === "plain" ? bodyFormatRaw : "plain",
    sentAt: String(raw.sentAt ?? raw.SentAt),
    sentCount: Number(raw.sentCount ?? raw.SentCount ?? 0),
    failedCount: Number(raw.failedCount ?? raw.FailedCount ?? 0),
    skippedCount: Number(raw.skippedCount ?? raw.SkippedCount ?? 0),
    status: String(raw.status ?? raw.Status),
    results: results.map((item) => {
      const row = item as Record<string, unknown>;
      const status = row.status ?? row.Status;
      return {
        clientId: String(row.clientId ?? row.ClientId),
        fullName: String(row.fullName ?? row.FullName),
        email: typeof row.email === "string" ? row.email : typeof row.Email === "string" ? row.Email : null,
        status: status === "sent" || status === "failed" || status === "skipped" ? status : "failed",
        failureReason:
          typeof row.failureReason === "string"
            ? row.failureReason
            : typeof row.FailureReason === "string"
              ? row.FailureReason
              : null,
      };
    }),
  };
}
