import { getPublicApiBaseUrl } from "@/lib/api";

export type RegistrationTimeZoneOption = {
  id: string;
  label: string;
};

export type TenantRegistrationTimeZone = {
  registrationTimeZoneId: string;
  displayLabel: string;
  registrationMonthResetsAt: string;
  options: RegistrationTimeZoneOption[];
};

export type TenantNotificationSettings = {
  emailOnNewRegistration: boolean;
  adminContactEmail: string | null;
};

function parseResponse(raw: Record<string, unknown>): TenantRegistrationTimeZone {
  const optionsRaw = raw.options ?? raw.Options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw
        .map((item) => {
          const row = item as Record<string, unknown>;
          const id = row.id ?? row.Id;
          const label = row.label ?? row.Label;
          if (typeof id !== "string" || typeof label !== "string") {
            return null;
          }
          return { id, label };
        })
        .filter((item): item is RegistrationTimeZoneOption => item !== null)
    : [];

  return {
    registrationTimeZoneId: String(
      raw.registrationTimeZoneId ?? raw.RegistrationTimeZoneId ?? "UTC"
    ),
    displayLabel: String(raw.displayLabel ?? raw.DisplayLabel ?? "UTC"),
    registrationMonthResetsAt: String(
      raw.registrationMonthResetsAt ?? raw.RegistrationMonthResetsAt ?? ""
    ),
    options,
  };
}

function parseNotificationSettings(raw: Record<string, unknown>): TenantNotificationSettings {
  const adminRaw = raw.adminContactEmail ?? raw.AdminContactEmail;
  return {
    emailOnNewRegistration: Boolean(
      raw.emailOnNewRegistration ?? raw.EmailOnNewRegistration ?? true
    ),
    adminContactEmail:
      typeof adminRaw === "string" && adminRaw.trim().length > 0 ? adminRaw.trim() : null,
  };
}

export async function fetchTenantRegistrationTimeZone(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<TenantRegistrationTimeZone> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/registration-timezone`
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not load timezone settings.");
  }
  return parseResponse(raw);
}

export async function updateTenantRegistrationTimeZone(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  registrationTimeZoneId: string
): Promise<TenantRegistrationTimeZone> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/registration-timezone`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationTimeZoneId }),
    }
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not update timezone.");
  }
  return parseResponse(raw);
}

export async function fetchTenantNotificationSettings(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<TenantNotificationSettings> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/notifications`
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not load notification settings.");
  }
  return parseNotificationSettings(raw);
}

export async function updateTenantNotificationSettings(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  emailOnNewRegistration: boolean
): Promise<TenantNotificationSettings> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/notifications`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOnNewRegistration }),
    }
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not update notification settings.");
  }
  return parseNotificationSettings(raw);
}
