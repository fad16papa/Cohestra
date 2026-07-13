export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const STORAGE_KEY = "auth_session";
const EXPIRY_BUFFER_MS = 30_000;

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAccessTokenExpired(
  session: AuthSession,
  bufferMs = EXPIRY_BUFFER_MS
): boolean {
  return Date.now() >= session.expiresAt - bufferMs;
}

export function createAuthSession(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
): AuthSession {
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}
