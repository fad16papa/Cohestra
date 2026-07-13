import { getPublicApiBaseUrl } from "@/lib/api";
import { applyPhoneFieldDefaults } from "@/lib/phone-countries";

export type ActivityStatus = "draft" | "published" | "archived";

export type FormFieldType =
  | "text"
  | "phone"
  | "email"
  | "select"
  | "checkbox"
  | "consent"
  | "referral_source";

export type FormFieldOption = {
  value: string;
  label: string;
};

export type FormFieldDefinition = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder: string | null;
  options: FormFieldOption[] | null;
  consentText: string | null;
  phoneCountry?: string | null;
};

export type ActivityFormSchema = {
  version: number;
  fields: FormFieldDefinition[];
};

export type Activity = {
  id: string;
  name: string;
  slug: string;
  category: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl: string | null;
  accentColor: string | null;
  showOnHomepage: boolean;
  status: ActivityStatus;
  formSchema: ActivityFormSchema | null;
  registrationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityListResult = {
  items: Activity[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CreateActivityInput = {
  name: string;
  category: string;
  schedule: string;
  location: string;
  communityLabel: string;
  status?: ActivityStatus;
};

export type UpdateActivityInput = {
  name: string;
  category: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  accentColor?: string | null;
};

export function parseFormSchema(raw: unknown): ActivityFormSchema | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== "object") {
    throw new Error("Invalid activity form schema payload");
  }

  const schema = raw as Record<string, unknown>;
  const version = schema.version ?? schema.Version;
  const fields = schema.fields ?? schema.Fields;

  if (typeof version !== "number" || !Array.isArray(fields)) {
    throw new Error("Invalid activity form schema payload");
  }

  return {
    version,
    fields: fields.map((field) => {
      const item = field as Record<string, unknown>;
      const id = item.id ?? item.Id;
      const type = item.type ?? item.Type;
      const label = item.label ?? item.Label;
      const required = item.required ?? item.Required;
      const placeholder = item.placeholder ?? item.Placeholder;
      const options = item.options ?? item.Options;
      const consentText = item.consentText ?? item.ConsentText;
      const phoneCountry = item.phoneCountry ?? item.PhoneCountry;

      if (
        typeof id !== "string" ||
        typeof type !== "string" ||
        typeof label !== "string" ||
        typeof required !== "boolean"
      ) {
        throw new Error("Invalid activity form schema field");
      }

      let parsedOptions: FormFieldOption[] | null = null;
      if (options !== null && options !== undefined) {
        if (!Array.isArray(options)) {
          throw new Error("Invalid activity form schema field options");
        }

        parsedOptions = options.map((option) => {
          const entry = option as Record<string, unknown>;
          const value = entry.value ?? entry.Value;
          const optionLabel = entry.label ?? entry.Label;
          if (typeof value !== "string" || typeof optionLabel !== "string") {
            throw new Error("Invalid activity form schema option");
          }

          return { value, label: optionLabel };
        });
      }

      return applyPhoneFieldDefaults({
        id,
        type: type as FormFieldType,
        label,
        required,
        placeholder: typeof placeholder === "string" ? placeholder : null,
        options: parsedOptions,
        consentText: typeof consentText === "string" ? consentText : null,
        phoneCountry:
          typeof phoneCountry === "string" && phoneCountry.trim()
            ? phoneCountry.trim().toUpperCase()
            : null,
      });
    }),
  };
}

function parseActivity(raw: Record<string, unknown>): Activity {
  const id = raw.id ?? raw.Id;
  const name = raw.name ?? raw.Name;
  const slug = raw.slug ?? raw.Slug;
  const category = raw.category ?? raw.Category;
  const schedule = raw.schedule ?? raw.Schedule;
  const location = raw.location ?? raw.Location;
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const heroImageUrl = raw.heroImageUrl ?? raw.HeroImageUrl;
  const accentColor = raw.accentColor ?? raw.AccentColor;
  const showOnHomepage = raw.showOnHomepage ?? raw.ShowOnHomepage;
  const status = raw.status ?? raw.Status;
  const formSchemaRaw = raw.formSchema ?? raw.FormSchema;
  const registrationCount = raw.registrationCount ?? raw.RegistrationCount;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof category !== "string" ||
    typeof schedule !== "string" ||
    typeof location !== "string" ||
    typeof communityLabel !== "string" ||
    typeof status !== "string" ||
    typeof showOnHomepage !== "boolean" ||
    typeof registrationCount !== "number" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new Error("Invalid activity payload");
  }

  return {
    id,
    name,
    slug,
    category,
    schedule,
    location,
    communityLabel,
    heroImageUrl: typeof heroImageUrl === "string" ? heroImageUrl : null,
    accentColor: typeof accentColor === "string" ? accentColor : null,
    showOnHomepage,
    status: status as ActivityStatus,
    formSchema: parseFormSchema(formSchemaRaw),
    registrationCount,
    createdAt,
    updatedAt,
  };
}

function parseActivityList(raw: Record<string, unknown>): ActivityListResult {
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
    throw new Error("Invalid activity list payload");
  }

  return {
    items: items.map((item) => parseActivity(item as Record<string, unknown>)),
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

export async function fetchActivities(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  params: {
    status?: ActivityStatus | "";
    category?: string;
    community?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<ActivityListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.category?.trim()) {
    searchParams.set("category", params.category.trim());
  }

  if (params.community?.trim()) {
    searchParams.set("community", params.community.trim());
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivityList(raw);
}

const ACTIVITY_FETCH_ALL_PAGE_SIZE = 100;

export async function fetchAllActivities(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  params: {
    status?: ActivityStatus | "";
    category?: string;
    community?: string;
    search?: string;
  } = {}
): Promise<Activity[]> {
  const items: Activity[] = [];
  let page = 1;
  let totalCount = 0;

  do {
    const result = await fetchActivities(authFetch, {
      ...params,
      page,
      pageSize: ACTIVITY_FETCH_ALL_PAGE_SIZE,
    });
    items.push(...result.items);
    totalCount = result.totalCount;
    page += 1;
  } while (items.length < totalCount);

  return items;
}

export async function fetchActivityById(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function createActivity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  input: CreateActivityInput
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        status: input.status ?? "draft",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function updateActivity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  input: UpdateActivityInput
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        category: input.category,
        schedule: input.schedule,
        location: input.location,
        communityLabel: input.communityLabel,
        heroImageUrl: input.heroImageUrl?.trim() || null,
        accentColor: input.accentColor?.trim() || null,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function updateActivityShowOnHomepage(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  showOnHomepage: boolean
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/show-on-homepage`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHomepage }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function saveActivityFormSchema(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  formSchema: ActivityFormSchema
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/form-schema`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formSchema }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function publishActivity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/publish`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function unpublishActivity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/unpublish`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export async function archiveActivity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<Activity> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/archive`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivity(raw);
}

export type PublicActivity = {
  slug: string;
  name: string;
  status: ActivityStatus;
  isRegistrationOpen: boolean;
};

function parsePublicActivity(raw: Record<string, unknown>): PublicActivity {
  const slug = raw.slug ?? raw.Slug;
  const name = raw.name ?? raw.Name;
  const status = raw.status ?? raw.Status;
  const isRegistrationOpen = raw.isRegistrationOpen ?? raw.IsRegistrationOpen;

  if (
    typeof slug !== "string" ||
    typeof name !== "string" ||
    typeof status !== "string" ||
    typeof isRegistrationOpen !== "boolean"
  ) {
    throw new Error("Invalid public activity payload");
  }

  return {
    slug,
    name,
    status: status as ActivityStatus,
    isRegistrationOpen,
  };
}

export async function fetchPublicActivityBySlug(
  slug: string
): Promise<PublicActivity | null> {
  const response = await fetch(
    `${getPublicApiBaseUrl()}/api/v1/public/activities/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parsePublicActivity(raw);
}

export type ActivityRegistrationLink = {
  url: string;
  slug: string;
  path: string;
};

export type ActivityRegistrationListItem = {
  registrationId: string;
  registrationNumber: string;
  clientId: string;
  clientFullName: string;
  submittedAt: string;
};

export type ActivityRegistrationListResult = {
  items: ActivityRegistrationListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

function parseActivityRegistrationListItem(
  raw: Record<string, unknown>
): ActivityRegistrationListItem {
  const registrationId = raw.registrationId ?? raw.RegistrationId;
  const registrationNumber = raw.registrationNumber ?? raw.RegistrationNumber;
  const clientId = raw.clientId ?? raw.ClientId;
  const clientFullName = raw.clientFullName ?? raw.ClientFullName;
  const submittedAt = raw.submittedAt ?? raw.SubmittedAt;

  if (
    typeof registrationId !== "string" ||
    typeof registrationNumber !== "string" ||
    typeof clientId !== "string" ||
    typeof clientFullName !== "string" ||
    typeof submittedAt !== "string"
  ) {
    throw new Error("Invalid activity registration list item payload");
  }

  return {
    registrationId,
    registrationNumber,
    clientId,
    clientFullName,
    submittedAt,
  };
}

function parseActivityRegistrationList(
  raw: Record<string, unknown>
): ActivityRegistrationListResult {
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
    throw new Error("Invalid activity registration list payload");
  }

  return {
    items: items.map((item) =>
      parseActivityRegistrationListItem(item as Record<string, unknown>)
    ),
    page,
    pageSize,
    totalCount,
  };
}

function parseActivityRegistrationLink(
  raw: Record<string, unknown>
): ActivityRegistrationLink {
  const url = raw.url ?? raw.Url;
  const slug = raw.slug ?? raw.Slug;
  const path = raw.path ?? raw.Path;

  if (
    typeof url !== "string" ||
    typeof slug !== "string" ||
    typeof path !== "string"
  ) {
    throw new Error("Invalid registration link payload");
  }

  return { url, slug, path };
}

export async function fetchActivityRegistrationLink(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<ActivityRegistrationLink> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/registration-link`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivityRegistrationLink(raw);
}

export async function fetchActivityRegistrations(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ActivityRegistrationListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/registrations?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseActivityRegistrationList(raw);
}

export async function fetchActivityQrCodeBlob(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<Blob> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/activities/${id}/qr-code.png`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return response.blob();
}

export function matchesActivitySearch(activity: Activity, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    activity.name.toLowerCase().includes(normalized) ||
    activity.communityLabel.toLowerCase().includes(normalized) ||
    activity.category.toLowerCase().includes(normalized) ||
    activity.location.toLowerCase().includes(normalized)
  );
}
