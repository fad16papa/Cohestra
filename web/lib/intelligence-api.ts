import { getPublicApiBaseUrl } from "@/lib/api";

export type IntelligenceEvidence = {
  label: string;
  value: string;
  href: string | null;
};

export type IntelligenceAction = {
  label: string;
  href: string;
};

export type IntelligenceInsight = {
  id: string;
  kind: string;
  priority: number;
  title: string;
  whyItMatters: string;
  whatChanged: string | null;
  evidence: IntelligenceEvidence[];
  recommendedAction: IntelligenceAction;
};

export type IntelligenceInsufficientData = {
  isInsufficient: boolean;
  message: string;
};

export type IntelligenceBrief = {
  generatedAt: string;
  timeZoneId: string;
  mode: string;
  insights: IntelligenceInsight[];
  insufficientData: IntelligenceInsufficientData;
};

export function isSafeAdminHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("://");
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readHref(value: unknown): string | null {
  const href = readString(value);
  if (!href || !isSafeAdminHref(href)) {
    return null;
  }

  return href;
}

function parseEvidence(raw: unknown): IntelligenceEvidence | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const label = readString(record.label ?? record.Label);
  const value = readString(record.value ?? record.Value);
  if (!label || value === null) {
    return null;
  }

  return {
    label,
    value,
    href: readHref(record.href ?? record.Href),
  };
}

function parseInsight(raw: unknown): IntelligenceInsight | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = readString(record.id ?? record.Id);
  const kind = readString(record.kind ?? record.Kind);
  const title = readString(record.title ?? record.Title);
  const whyItMatters = readString(record.whyItMatters ?? record.WhyItMatters);
  const priorityRaw = record.priority ?? record.Priority;
  const evidenceRaw = record.evidence ?? record.Evidence;
  const actionRaw = record.recommendedAction ?? record.RecommendedAction;

  if (
    !id ||
    !kind ||
    !title ||
    !whyItMatters ||
    typeof priorityRaw !== "number" ||
    !Number.isFinite(priorityRaw) ||
    !Array.isArray(evidenceRaw) ||
    !actionRaw ||
    typeof actionRaw !== "object"
  ) {
    return null;
  }

  const actionRecord = actionRaw as Record<string, unknown>;
  const actionLabel = readString(actionRecord.label ?? actionRecord.Label);
  const actionHref = readHref(actionRecord.href ?? actionRecord.Href);
  if (!actionLabel || !actionHref) {
    return null;
  }

  const whatChangedRaw = record.whatChanged ?? record.WhatChanged;
  const whatChanged =
    whatChangedRaw === null || whatChangedRaw === undefined
      ? null
      : readString(whatChangedRaw);

  const evidence = evidenceRaw
    .map(parseEvidence)
    .filter((item): item is IntelligenceEvidence => item !== null);

  if (evidence.length !== evidenceRaw.length) {
    return null;
  }

  return {
    id,
    kind,
    priority: priorityRaw,
    title,
    whyItMatters,
    whatChanged,
    evidence,
    recommendedAction: { label: actionLabel, href: actionHref },
  };
}

export function parseIntelligenceBrief(raw: unknown): IntelligenceBrief {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid intelligence brief payload");
  }

  const record = raw as Record<string, unknown>;
  const generatedAt = readString(record.generatedAt ?? record.GeneratedAt);
  const timeZoneId = readString(record.timeZoneId ?? record.TimeZoneId);
  const mode = readString(record.mode ?? record.Mode);
  const insightsRaw = record.insights ?? record.Insights;
  const insufficientRaw =
    record.insufficientData ?? record.InsufficientData;

  if (
    !generatedAt ||
    !timeZoneId ||
    !mode ||
    !Array.isArray(insightsRaw) ||
    !insufficientRaw ||
    typeof insufficientRaw !== "object"
  ) {
    throw new Error("Invalid intelligence brief payload");
  }

  const insufficientRecord = insufficientRaw as Record<string, unknown>;
  const isInsufficient = insufficientRecord.isInsufficient ?? insufficientRecord.IsInsufficient;
  const message = insufficientRecord.message ?? insufficientRecord.Message;
  if (typeof isInsufficient !== "boolean" || typeof message !== "string") {
    throw new Error("Invalid intelligence brief payload");
  }

  const insights = insightsRaw
    .map(parseInsight)
    .filter((item): item is IntelligenceInsight => item !== null);

  if (insights.length !== insightsRaw.length) {
    throw new Error("Invalid intelligence brief payload");
  }

  return {
    generatedAt,
    timeZoneId,
    mode,
    insights,
    insufficientData: {
      isInsufficient,
      message,
    },
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

export async function fetchIntelligenceBrief(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<IntelligenceBrief> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/intelligence/brief`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseIntelligenceBrief(await response.json());
}
