import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_SESSION_STORAGE_KEY,
  clearAuthSession,
  clearAuthSessionIfRefreshTokenMatches,
  createAuthSession,
  getAuthSession,
  isAccessTokenExpired,
  setAuthSession,
} from "@/lib/auth-storage";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("auth-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and reads a session", () => {
    const session = createAuthSession("access", "refresh", 900);
    setAuthSession(session);

    expect(getAuthSession()).toEqual(session);
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeTruthy();
  });

  it("detects expired access tokens with buffer", () => {
    const session = createAuthSession("access", "refresh", 1);
    session.expiresAt = Date.now() + 10_000;

    expect(isAccessTokenExpired(session, 30_000)).toBe(true);
    expect(isAccessTokenExpired(session, 0)).toBe(false);
  });

  it("clears session only when refresh token matches", () => {
    const session = createAuthSession("access", "refresh-old", 900);
    setAuthSession(session);

    expect(clearAuthSessionIfRefreshTokenMatches("refresh-stale")).toBe(false);
    expect(getAuthSession()?.refreshToken).toBe("refresh-old");

    expect(clearAuthSessionIfRefreshTokenMatches("refresh-old")).toBe(true);
    expect(getAuthSession()).toBeNull();
  });

  it("does not clear a replaced session", () => {
    setAuthSession(createAuthSession("access-a", "refresh-a", 900));

    const staleRefreshToken = "refresh-a";
    setAuthSession(createAuthSession("access-b", "refresh-b", 900));

    expect(clearAuthSessionIfRefreshTokenMatches(staleRefreshToken)).toBe(false);
    expect(getAuthSession()?.refreshToken).toBe("refresh-b");
  });

  it("clearAuthSession removes storage", () => {
    setAuthSession(createAuthSession("access", "refresh", 900));
    clearAuthSession();
    expect(getAuthSession()).toBeNull();
  });
});
