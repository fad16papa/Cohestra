import { getPublicApiBaseUrl } from "@/lib/api";

export type SlugAvailability = {
  available: boolean;
  slug: string;
  validationError: string | null;
  suggestions: string[];
};

export type PublicSignupResult = {
  email: string;
  tenantSlug: string;
  otpExpiresInSeconds: number;
  message: string;
};

export type SignupVerifyResult = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tenantSlug: string;
};

function parseProblem(raw: Record<string, unknown>): string {
  const detail = raw.detail ?? raw.Detail;
  const title = raw.title ?? raw.Title;
  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }

  if (typeof title === "string") {
    return title;
  }

  return "Request failed.";
}

function parseSuggestions(raw: Record<string, unknown>): string[] {
  const suggestions = raw.suggestions ?? raw.Suggestions;
  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions.filter((item): item is string => typeof item === "string");
}

function parseSlugAvailability(raw: Record<string, unknown>): SlugAvailability | null {
  const slug = raw.slug ?? raw.Slug;
  const available = raw.available ?? raw.Available;
  const validationError = raw.validationError ?? raw.ValidationError;
  const suggestions = raw.suggestions ?? raw.Suggestions;

  if (typeof slug !== "string" || typeof available !== "boolean") {
    return null;
  }

  return {
    available,
    slug,
    validationError: typeof validationError === "string" ? validationError : null,
    suggestions: Array.isArray(suggestions)
      ? suggestions.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export async function checkSignupSlug(slug: string): Promise<SlugAvailability> {
  const params = new URLSearchParams({ slug });
  const response = await fetch(
    `${getPublicApiBaseUrl()}/api/v1/public/signup/slug-check?${params.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Slug check failed (${response.status})`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const parsed = parseSlugAvailability(raw);
  if (!parsed) {
    throw new Error("Invalid slug check response");
  }

  return parsed;
}

export async function submitPublicSignup(payload: {
  acceptTermsAndPrivacy: boolean;
  termsVersion: string;
  privacyVersion: string;
  orgName: string;
  slug: string;
  email: string;
  password: string;
  captchaToken: string;
}): Promise<
  | { ok: true; result: PublicSignupResult }
  | { ok: false; message: string; suggestions: string[] }
> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acceptTermsAndPrivacy: payload.acceptTermsAndPrivacy,
      termsVersion: payload.termsVersion,
      privacyVersion: payload.privacyVersion,
      orgName: payload.orgName,
      slug: payload.slug,
      email: payload.email,
      password: payload.password,
      captchaToken: payload.captchaToken,
    }),
  });

  const raw = (await response.json()) as Record<string, unknown>;

  if (response.status === 201) {
    const email = raw.email ?? raw.Email;
    const tenantSlug = raw.tenantSlug ?? raw.TenantSlug;
    const otpExpiresInSeconds = raw.otpExpiresInSeconds ?? raw.OtpExpiresInSeconds;
    const message = raw.message ?? raw.Message;

    if (
      typeof email !== "string"
      || typeof tenantSlug !== "string"
      || typeof message !== "string"
    ) {
      return { ok: false, message: "Invalid signup response.", suggestions: [] };
    }

    return {
      ok: true,
      result: {
        email,
        tenantSlug,
        otpExpiresInSeconds: typeof otpExpiresInSeconds === "number" ? otpExpiresInSeconds : 600,
        message,
      },
    };
  }

  return {
    ok: false,
    message: parseProblem(raw),
    suggestions: parseSuggestions(raw),
  };
}

export async function verifySignupEmail(payload: {
  email: string;
  code: string;
  tenantSlug: string;
}): Promise<{ ok: true; result: SignupVerifyResult } | { ok: false; message: string }> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/signup/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      code: payload.code,
      tenantSlug: payload.tenantSlug,
    }),
  });

  const raw = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    return { ok: false, message: parseProblem(raw) };
  }

  const accessToken = raw.accessToken ?? raw.AccessToken;
  const refreshToken = raw.refreshToken ?? raw.RefreshToken;
  const expiresInSeconds = raw.expiresInSeconds ?? raw.ExpiresInSeconds;
  const tenantSlug = raw.tenantSlug ?? raw.TenantSlug;

  if (
    typeof accessToken !== "string"
    || typeof refreshToken !== "string"
    || typeof tenantSlug !== "string"
  ) {
    return { ok: false, message: "Invalid verification response." };
  }

  return {
    ok: true,
    result: {
      accessToken,
      refreshToken,
      expiresInSeconds: typeof expiresInSeconds === "number" ? expiresInSeconds : 900,
      tenantSlug,
    },
  };
}

export async function resendSignupOtp(payload: {
  email: string;
  tenantSlug: string;
}): Promise<string> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/signup/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      tenantSlug: payload.tenantSlug,
    }),
  });

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  const message = raw.message ?? raw.Message;
  if (typeof message !== "string") {
    return "A new verification code was sent.";
  }

  return message;
}

export function getRecaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
}

export function isRecaptchaEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") {
    return false;
  }

  return getRecaptchaSiteKey().length > 0;
}

export function getTestCaptchaToken(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN?.trim() || "test-captcha-pass";
}

export function buildTenantDashboardUrl(slug: string): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname.endsWith(".nip.io")) {
      const parts = hostname.split(".");
      // Tenant host: slug.129-212-235-2.nip.io (4 labels)
      if (parts.length >= 4) {
        return `${window.location.origin}/dashboard`;
      }

      // Marketing apex: 129-212-235-2.nip.io (3 labels)
      if (parts.length === 3) {
        const protocol = window.location.protocol;
        return `${protocol}//${slug}.${parts[0]}.nip.io/dashboard`;
      }
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${slug}.localhost/dashboard`;
    }

    if (hostname.endsWith(".cohestra.app")) {
      const apex = hostname === "cohestra.app" || hostname === "www.cohestra.app"
        ? "cohestra.app"
        : hostname.split(".").slice(-2).join(".");
      return `https://${slug}.${apex}/dashboard`;
    }
  }

  return `https://${slug}.cohestra.app/dashboard`;
}
