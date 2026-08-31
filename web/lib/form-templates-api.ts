import type { ActivityFormSchema, RegistrationThemePreset } from "@/lib/activities-api";
import { getPublicApiBaseUrl } from "@/lib/api";

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

function parseFormSchema(raw: Record<string, unknown>): ActivityFormSchema {
  const version = raw.version ?? raw.Version;
  const fieldsRaw = raw.fields ?? raw.Fields;
  const metaRaw = raw.meta ?? raw.Meta;

  const fields = Array.isArray(fieldsRaw)
    ? fieldsRaw.map((field) => {
        const item = field as Record<string, unknown>;
        const optionsRaw = item.options ?? item.Options;
        const visibleWhenRaw = item.visibleWhen ?? item.VisibleWhen;
        const visibleWhen =
          visibleWhenRaw && typeof visibleWhenRaw === "object"
            ? (() => {
                const vw = visibleWhenRaw as Record<string, unknown>;
                return {
                  fieldId: String(vw.fieldId ?? vw.FieldId ?? ""),
                  equals: (vw.equals ?? vw.EqualsValue ?? null) as string | null,
                  notEquals: (vw.notEquals ?? vw.NotEqualsValue ?? null) as string | null,
                };
              })()
            : null;

        return {
          id: String(item.id ?? item.Id ?? ""),
          type: String(item.type ?? item.Type ?? ""),
          label: String(item.label ?? item.Label ?? ""),
          required: Boolean(item.required ?? item.Required ?? false),
          placeholder: (item.placeholder ?? item.Placeholder ?? null) as string | null,
          options: Array.isArray(optionsRaw)
            ? optionsRaw.map((option) => {
                const opt = option as Record<string, unknown>;
                return {
                  value: String(opt.value ?? opt.Value ?? ""),
                  label: String(opt.label ?? opt.Label ?? ""),
                };
              })
            : null,
          consentText: (item.consentText ?? item.ConsentText ?? null) as string | null,
          phoneCountry: (item.phoneCountry ?? item.PhoneCountry ?? null) as string | null,
          visibleWhen,
          step: (item.step ?? item.Step ?? null) as string | null,
          defaultValue: (item.defaultValue ?? item.DefaultValue ?? null) as string | null,
          min: (item.min ?? item.Min ?? null) as number | null,
          max: (item.max ?? item.Max ?? null) as number | null,
          infoText: (item.infoText ?? item.InfoText ?? null) as string | null,
        };
      })
    : [];

  const meta =
    metaRaw && typeof metaRaw === "object"
      ? (() => {
          const m = metaRaw as Record<string, unknown>;
          return {
            introMarkdown: (m.introMarkdown ?? m.IntroMarkdown ?? null) as string | null,
            splitIntoSteps: Boolean(m.splitIntoSteps ?? m.SplitIntoSteps ?? false),
            successCopyMarkdown: (m.successCopyMarkdown ?? m.SuccessCopyMarkdown ?? null) as
              | string
              | null,
            confirmationEmailSubject: (m.confirmationEmailSubject ??
              m.ConfirmationEmailSubject ??
              null) as string | null,
            confirmationEmailBodyMarkdown: (m.confirmationEmailBodyMarkdown ??
              m.ConfirmationEmailBodyMarkdown ??
              null) as string | null,
            closedMessage: (m.closedMessage ?? m.ClosedMessage ?? null) as string | null,
            registrationClosesAt: (m.registrationClosesAt ??
              m.RegistrationClosesAt ??
              null) as string | null,
          };
        })()
      : undefined;

  return {
    version: typeof version === "number" ? version : 1,
    fields,
    meta,
  };
}

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
    formSchema: parseFormSchema(formSchemaRaw as Record<string, unknown>),
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
  authFetch: typeof fetch
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
  authFetch: typeof fetch,
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
  authFetch: typeof fetch,
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
  authFetch: typeof fetch,
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
  authFetch: typeof fetch,
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
  authFetch: typeof fetch,
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
  authFetch: typeof fetch,
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
