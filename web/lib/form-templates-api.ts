import type { ActivityFormSchema, RegistrationThemePreset } from "@/lib/activities-api";
import { parseFormSchema } from "@/lib/activities-api";
import { getPublicApiBaseUrl } from "@/lib/api";

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type SavedFormTemplateSummary = {
  id: string;
  name: string;
  pinnedRegistrationThemePreset: RegistrationThemePreset | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedFormTemplate = SavedFormTemplateSummary & {
  formSchema: ActivityFormSchema;
};

export type FormTemplateUsage = {
  used: number;
  limit: number;
};

export function formTemplateSlotLimitForPlan(plan: string): number {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "core") {
    return 5;
  }

  if (normalized === "pro") {
    return 25;
  }

  if (normalized === "enterprise") {
    return 999;
  }

  return 1;
}

export function createDefaultFormTemplateUsage(plan: string): FormTemplateUsage {
  return { used: 0, limit: formTemplateSlotLimitForPlan(plan) };
}

export type FormTemplateListResult = {
  templates: SavedFormTemplateSummary[];
  usage: FormTemplateUsage;
};

function parseSummary(raw: Record<string, unknown>): SavedFormTemplateSummary {
  const presetRaw = raw.pinnedRegistrationThemePreset ?? raw.PinnedRegistrationThemePreset;
  const preset =
    presetRaw === null || presetRaw === undefined
      ? null
      : typeof presetRaw === "string"
        ? (presetRaw as RegistrationThemePreset)
        : null;

  return {
    id: String(raw.id ?? raw.Id ?? ""),
    name: String(raw.name ?? raw.Name ?? ""),
    pinnedRegistrationThemePreset: preset,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ""),
  };
}

function parseTemplate(raw: Record<string, unknown>): SavedFormTemplate {
  const formSchemaRaw = raw.formSchema ?? raw.FormSchema;
  if (!formSchemaRaw || typeof formSchemaRaw !== "object") {
    throw new Error("Saved template is missing form schema.");
  }

  return {
    ...parseSummary(raw),
    formSchema: parseFormSchema(formSchemaRaw) ?? { version: 1, fields: [] },
  };
}

function parseUsage(raw: Record<string, unknown>): FormTemplateUsage {
  const used = Number(raw.used ?? raw.Used ?? 0);
  const limit = Number(raw.limit ?? raw.Limit ?? 1);

  if (!Number.isFinite(used) || !Number.isFinite(limit)) {
    throw new Error("Form template usage response is invalid.");
  }

  return { used, limit };
}

async function parseProblemDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const detail = body.detail ?? body.Detail;
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
  } catch {
    // fall through
  }

  return `Request failed (${response.status}).`;
}

export async function fetchFormTemplates(
  authFetch: AuthFetch
): Promise<FormTemplateListResult> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/form-templates`);

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const templatesRaw = raw.templates ?? raw.Templates;
  const usageRaw = raw.usage ?? raw.Usage;

  return {
    templates: Array.isArray(templatesRaw)
      ? templatesRaw.map((item) => parseSummary(item as Record<string, unknown>))
      : [],
    usage:
      usageRaw && typeof usageRaw === "object"
        ? parseUsage(usageRaw as Record<string, unknown>)
        : createDefaultFormTemplateUsage("Basic"),
  };
}

export async function fetchFormTemplate(
  authFetch: AuthFetch,
  id: string
): Promise<SavedFormTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/form-templates/${id}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseTemplate((await response.json()) as Record<string, unknown>);
}

export async function createFormTemplate(
  authFetch: AuthFetch,
  name: string,
  formSchema: ActivityFormSchema
): Promise<SavedFormTemplate> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/form-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, formSchema }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseTemplate((await response.json()) as Record<string, unknown>);
}

export async function updateFormTemplate(
  authFetch: AuthFetch,
  id: string,
  payload: { name?: string; formSchema?: ActivityFormSchema }
): Promise<SavedFormTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/form-templates/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseTemplate((await response.json()) as Record<string, unknown>);
}

export async function deleteFormTemplate(
  authFetch: AuthFetch,
  id: string
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/form-templates/${id}`,
    { method: "DELETE" }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(await parseProblemDetail(response));
  }
}

export async function setFormTemplatePinnedPreset(
  authFetch: AuthFetch,
  id: string,
  preset: RegistrationThemePreset | null
): Promise<SavedFormTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/form-templates/${id}/pinned-preset`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseTemplate((await response.json()) as Record<string, unknown>);
}

export async function duplicateFormTemplate(
  authFetch: AuthFetch,
  id: string,
  name?: string
): Promise<SavedFormTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/form-templates/${id}/duplicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(name ? { name } : {}),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseTemplate((await response.json()) as Record<string, unknown>);
}

export function isFormTemplateSaveBlocked(usage: FormTemplateUsage): boolean {
  return usage.limit > 0 && usage.used >= usage.limit;
}

export function formTemplateUpgradePlan(
  plan: string
): "Core" | "Pro" | null {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "basic") {
    return "Core";
  }

  if (normalized === "core") {
    return "Pro";
  }

  return null;
}
