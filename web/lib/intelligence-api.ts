import { getPublicApiBaseUrl } from "@/lib/api";

export type IntelligenceEvidence = {
  label: string;
  value: string;
  href: string | null;
};

export type IntelligenceAction = {
  label: string;
  href: string | null;
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

export class IntelligenceRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "IntelligenceRequestError";
    this.status = status;
  }
}

const SAFE_ADMIN_PATHS = [
  "/dashboard",
  "/clients",
  "/activities",
  "/follow-up",
  "/analytics",
  "/ai",
  "/reports",
] as const;

export function isSafeAdminHref(href: string): boolean {
  if (typeof href !== "string" || href.length === 0 || href !== href.trim()) {
    return false;
  }

  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("\\") ||
    href.includes("://") ||
    /[\u0000-\u001F\u007F]/.test(href)
  ) {
    return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(href);
  } catch {
    return false;
  }

  const lower = decoded.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    decoded.startsWith("//") ||
    decoded.includes("://") ||
    decoded.includes("\\")
  ) {
    return false;
  }

  const pathOnly = decoded.split(/[?#]/, 1)[0] ?? "";
  if (
    !pathOnly.startsWith("/") ||
    pathOnly.startsWith("//") ||
    pathOnly.includes("//") ||
    pathOnly.split("/").includes("..")
  ) {
    return false;
  }

  return SAFE_ADMIN_PATHS.some(
    (base) => pathOnly === base || pathOnly.startsWith(`${base}/`)
  );
}

export function presentIntelligenceMode(
  mode: string
): "deterministic" | "synthesized" {
  return mode === "synthesized" ? "synthesized" : "deterministic";
}

export function intelligenceModeLabel(mode: string): string {
  if (mode === "synthesized") {
    return "Synthesized from the same grounded facts.";
  }

  return "Based on workspace rules and data.";
}

export function intelligenceGeneratedLabel(brief: IntelligenceBrief): string {
  const generated = new Date(brief.generatedAt);
  const when = Number.isNaN(generated.getTime())
    ? brief.generatedAt
    : generated.toLocaleString();
  return `Generated ${when}. Times use workspace timezone ${brief.timeZoneId}.`;
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
  if (!actionLabel) {
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
    recommendedAction: {
      label: actionLabel,
      href: readHref(actionRecord.href ?? actionRecord.Href),
    },
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
    throw new IntelligenceRequestError(
      await parseProblemDetail(response),
      response.status
    );
  }

  try {
    return parseIntelligenceBrief(await response.json());
  } catch (error) {
    throw new IntelligenceRequestError(
      error instanceof Error ? error.message : "Invalid intelligence brief payload",
      response.status
    );
  }
}
