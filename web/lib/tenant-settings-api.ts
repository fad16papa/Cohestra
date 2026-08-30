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

export type TenantEmbedSettings = {
  allowedEmbedOrigins: string[];
};

export function parseEmbedSettingsResponse(raw: Record<string, unknown>): TenantEmbedSettings {
  const originsRaw = raw.allowedEmbedOrigins ?? raw.AllowedEmbedOrigins;
  const allowedEmbedOrigins = Array.isArray(originsRaw)
    ? originsRaw.filter((item): item is string => typeof item === "string")
    : [];

  return { allowedEmbedOrigins };
}

export async function fetchTenantEmbedSettings(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<TenantEmbedSettings> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/embed-settings`
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not load embed settings.");
  }
  return parseEmbedSettingsResponse(raw);
}

export async function updateTenantEmbedSettings(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  allowedEmbedOrigins: string[]
): Promise<TenantEmbedSettings> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/tenant/embed-settings`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedEmbedOrigins }),
    }
  );
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not update embed settings.");
  }
  return parseEmbedSettingsResponse(raw);
}
