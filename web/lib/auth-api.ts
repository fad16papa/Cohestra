import { getPublicApiBaseUrl, getServerApiBaseUrl } from "@/lib/api";
import {
  normalizeThemePreference,
  type ThemePreference,
} from "@/components/theme/theme-config";
import { normalizeBrandAccentColor } from "@/lib/brand-accent";
import {
  clearAuthSession,
  createAuthSession,
  getAuthSession,
  isAccessTokenExpired,
  setAuthSession,
  type AuthSession,
} from "@/lib/auth-storage";

const FETCH_TIMEOUT_MS = 10_000;

export type AdminProfile = {
  userId: string;
  email: string;
  nickname: string | null;
  roles: string[];
  themePreference: ThemePreference;
  brandAccentColor: string | null;
};

export type OnboardingStatus = {
  registrationAvailable: boolean;
  message: string | null;
};

export type LoginResult =
  | { ok: true; session: AuthSession; profile: AdminProfile }
  | { ok: false; message: string; errorCode?: string };

function parseAuthTokenResponse(raw: Record<string, unknown>): AuthSession {
  const accessToken = raw.accessToken ?? raw.AccessToken;
  const refreshToken = raw.refreshToken ?? raw.RefreshToken;
  const expiresInSeconds = raw.expiresInSeconds ?? raw.ExpiresInSeconds;

  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    typeof expiresInSeconds !== "number"
  ) {
    throw new Error("Invalid auth token payload");
  }

  return createAuthSession(accessToken, refreshToken, expiresInSeconds);
}

function parseAdminProfile(raw: Record<string, unknown>): AdminProfile {
  const userId = raw.userId ?? raw.UserId;
  const email = raw.email ?? raw.Email;
  const nickname = raw.nickname ?? raw.Nickname;
  const roles = raw.roles ?? raw.Roles;
  const themePreference = raw.themePreference ?? raw.ThemePreference;
  const brandAccentColor = raw.brandAccentColor ?? raw.BrandAccentColor;

  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid admin profile payload");
  }

  const normalizedBrand =
    typeof brandAccentColor === "string"
      ? normalizeBrandAccentColor(brandAccentColor)
      : null;

  return {
    userId,
    email,
    nickname: typeof nickname === "string" && nickname.trim().length > 0 ? nickname : null,
    roles: Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === "string")
      : [],
    themePreference: normalizeThemePreference(
      typeof themePreference === "string" ? themePreference : null
    ),
    brandAccentColor:
      normalizedBrand && /^#[0-9a-f]{6}$/.test(normalizedBrand)
        ? normalizedBrand
        : null,
  };
}

async function parseProblemDetail(response: Response): Promise<string> {
  const parsed = await parseProblemResponse(response);
  return parsed.message;
}

async function parseProblemResponse(
  response: Response
): Promise<{ message: string; errorCode?: string }> {
  try {
    const raw = (await response.json()) as Record<string, unknown>;
    const detail = raw.detail ?? raw.Detail;
    const extensions = raw.extensions ?? raw.Extensions;
    let errorCode: string | undefined;

    if (extensions && typeof extensions === "object") {
      const code = (extensions as Record<string, unknown>).errorCode;
      if (typeof code === "string") {
        errorCode = code;
      }
    }

    if (typeof detail === "string" && detail.length > 0) {
      return { message: detail, errorCode };
    }
  } catch {
    // fall through
  }

  return { message: `Request failed (${response.status})` };
}

async function postAuthTokens(
  path: string,
  body: Record<string, string>
): Promise<AuthSession> {
  const response = await fetch(`${getPublicApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseAuthTokenResponse(raw);
}

/** Post-login home: PlatformAdmin-only → platform console; tenant Admin → dashboard. */
export function resolvePostLoginPath(profile: AdminProfile): string {
  const roles = profile.roles;
  const isPlatformAdmin = roles.includes("PlatformAdmin");
  const isTenantAdmin = roles.includes("Admin");
  if (isPlatformAdmin && !isTenantAdmin) {
    return "/platform";
  }
  if (isTenantAdmin) {
    return "/dashboard";
  }
  if (isPlatformAdmin) {
    return "/platform";
  }
  return "/dashboard";
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const problem = await parseProblemResponse(response);
      clearAuthSession();
      return {
        ok: false,
        message: problem.message,
        errorCode: problem.errorCode,
      };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const session = parseAuthTokenResponse(raw);
    setAuthSession(session);
    const profile = await fetchSessionProfile(session.accessToken);
    return { ok: true, session, profile };
  } catch (error) {
    clearAuthSession();
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not sign in. Try again.",
    };
  }
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  const current = getAuthSession();
  if (!current?.refreshToken) {
    return null;
  }

  try {
    const session = await postAuthTokens("/api/v1/auth/refresh", {
      refreshToken: current.refreshToken,
    });
    setAuthSession(session);
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function fetchAdminProfile(
  accessToken: string
): Promise<AdminProfile> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/admin/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = new Error(await parseProblemDetail(response)) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseAdminProfile(raw);
}

/** PlatformAdmin-only users cannot call /admin/me (403). */
export async function fetchPlatformProfile(
  accessToken: string
): Promise<AdminProfile> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/platform/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parsePlatformProfile(raw);
}

function parsePlatformProfile(raw: Record<string, unknown>): AdminProfile {
  const userId = raw.userId ?? raw.UserId;
  const email = raw.email ?? raw.Email;
  const roles = raw.roles ?? raw.Roles;

  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid platform profile payload");
  }

  return {
    userId,
    email,
    nickname: null,
    roles: Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === "string")
      : [],
    themePreference: "system",
    brandAccentColor: null,
  };
}

export async function fetchSessionProfile(
  accessToken: string
): Promise<AdminProfile> {
  try {
    return await fetchAdminProfile(accessToken);
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    if (status === 403) {
      return fetchPlatformProfile(accessToken);
    }
    throw error;
  }
}

export async function ensureValidSession(): Promise<AuthSession | null> {
  const current = getAuthSession();
  if (!current) {
    return null;
  }

  if (!isAccessTokenExpired(current)) {
    return current;
  }

  return refreshAuthSession();
}

export async function validateStoredSession(): Promise<AdminProfile | null> {
  const session = await ensureValidSession();
  if (!session) {
    return null;
  }

  try {
    return await fetchSessionProfile(session.accessToken);
  } catch {
    const refreshed = await refreshAuthSession();
    if (!refreshed) {
      return null;
    }

    try {
      return await fetchSessionProfile(refreshed.accessToken);
    } catch {
      clearAuthSession();
      return null;
    }
  }
}

function withAuthHeaders(accessToken: string, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export async function fetchWithAuth(
  input: string,
  init: RequestInit = {},
  onSessionExpired?: () => void
): Promise<Response> {
  const attempt = async (accessToken: string) =>
    fetch(input, {
      ...init,
      headers: withAuthHeaders(accessToken, init),
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

  let session = await ensureValidSession();
  if (!session) {
    onSessionExpired?.();
    throw new Error("Session expired");
  }

  let response = await attempt(session.accessToken);
  if (response.status !== 401) {
    return response;
  }

  session = await refreshAuthSession();
  if (!session) {
    onSessionExpired?.();
    throw new Error("Session expired");
  }

  response = await attempt(session.accessToken);
  if (response.status === 401) {
    clearAuthSession();
    onSessionExpired?.();
    throw new Error("Session expired");
  }

  return response;
}

export type AppearanceSettings = {
  themePreference: ThemePreference;
  brandAccentColor: string | null;
};

export async function updateAppearanceSettings(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  settings: AppearanceSettings
): Promise<AdminProfile> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/me/appearance`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        themePreference: settings.themePreference,
        brandAccentColor: settings.brandAccentColor,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseAdminProfile(raw);
}

/** Convenience wrapper when only theme mode changes. */
export async function updateAppearancePreference(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  themePreference: ThemePreference,
  brandAccentColor: string | null = null
): Promise<AdminProfile> {
  return updateAppearanceSettings(authFetch, {
    themePreference,
    brandAccentColor,
  });
}

function parseOnboardingStatus(raw: Record<string, unknown>): OnboardingStatus {
  const registrationAvailable =
    raw.registrationAvailable ?? raw.RegistrationAvailable;
  const message = raw.message ?? raw.Message;

  if (typeof registrationAvailable !== "boolean") {
    throw new Error("Invalid onboarding status payload");
  }

  return {
    registrationAvailable,
    message: typeof message === "string" ? message : null,
  };
}

export async function fetchOnboardingStatusServer(): Promise<OnboardingStatus> {
  const response = await fetch(`${getServerApiBaseUrl()}/api/v1/auth/onboarding`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return { registrationAvailable: false, message: null };
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseOnboardingStatus(raw);
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/onboarding`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseOnboardingStatus(raw);
}

export async function registerOperator(input: {
  email: string;
  nickname: string;
  password: string;
}): Promise<{ email: string; otpExpiresInSeconds: number; message: string }> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const email = raw.email ?? raw.Email;
  const otpExpiresInSeconds = raw.otpExpiresInSeconds ?? raw.OtpExpiresInSeconds;
  const message = raw.message ?? raw.Message;

  if (
    typeof email !== "string" ||
    typeof otpExpiresInSeconds !== "number" ||
    typeof message !== "string"
  ) {
    throw new Error("Invalid registration response");
  }

  return { email, otpExpiresInSeconds, message };
}

export async function verifyEmailOtp(
  email: string,
  code: string
): Promise<LoginResult> {
  try {
    const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseProblemDetail(response),
      };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const session = parseAuthTokenResponse(raw);
    setAuthSession(session);
    const profile = await fetchAdminProfile(session.accessToken);
    return { ok: true, session, profile };
  } catch (error) {
    clearAuthSession();
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Verification failed. Try again.",
    };
  }
}

export async function resendAuthOtp(
  email: string,
  purpose: "email_verification" | "password_reset"
): Promise<string> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const message = raw.message ?? raw.Message;
  return typeof message === "string" ? message : "Code sent.";
}

export async function forgotPassword(email: string): Promise<string> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const message = raw.message ?? raw.Message;
  return typeof message === "string" ? message : "If an account exists, a reset code was sent.";
}

export async function resetPassword(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<string> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const message = raw.message ?? raw.Message;
  return typeof message === "string" ? message : "Password updated.";
}

export async function changePassword(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  input: { currentPassword: string; newPassword: string }
): Promise<string> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const message = raw.message ?? raw.Message;
  return typeof message === "string" ? message : "Password updated.";
}
