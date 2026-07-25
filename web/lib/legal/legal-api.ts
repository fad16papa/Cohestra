import { getPublicApiBaseUrl, getServerApiBaseUrl } from "@/lib/api";

export type LegalComplianceVersions = {
  termsVersion: string;
  privacyVersion: string;
  termsPath: string;
  privacyPath: string;
};

function parseVersions(raw: Record<string, unknown>): LegalComplianceVersions | null {
  const termsVersion = raw.termsVersion ?? raw.TermsVersion;
  const privacyVersion = raw.privacyVersion ?? raw.PrivacyVersion;
  const termsPath = raw.termsPath ?? raw.TermsPath;
  const privacyPath = raw.privacyPath ?? raw.PrivacyPath;

  if (
    typeof termsVersion !== "string"
    || typeof privacyVersion !== "string"
    || typeof termsPath !== "string"
    || typeof privacyPath !== "string"
  ) {
    return null;
  }

  return { termsVersion, privacyVersion, termsPath, privacyPath };
}

export async function fetchLegalComplianceVersionsServer(): Promise<LegalComplianceVersions> {
  const response = await fetch(`${getServerApiBaseUrl()}/api/v1/public/legal/versions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load legal versions (${response.status})`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const parsed = parseVersions(raw);
  if (!parsed) {
    throw new Error("Invalid legal versions payload");
  }

  return parsed;
}

export async function fetchLegalComplianceVersions(): Promise<LegalComplianceVersions> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/legal/versions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load legal versions (${response.status})`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const parsed = parseVersions(raw);
  if (!parsed) {
    throw new Error("Invalid legal versions payload");
  }

  return parsed;
}

export async function submitSignupLegalGate(payload: {
  acceptTermsAndPrivacy: boolean;
  termsVersion: string;
  privacyVersion: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acceptTermsAndPrivacy: payload.acceptTermsAndPrivacy,
      termsVersion: payload.termsVersion,
      privacyVersion: payload.privacyVersion,
    }),
  });

  if (response.status === 501) {
    return { ok: true };
  }

  if (response.status === 400) {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return { ok: false, message: problem.detail ?? problem.title ?? "Legal acceptance required." };
  }

  return {
    ok: false,
    message: `Signup request failed (${response.status}).`,
  };
}
