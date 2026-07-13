"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import {
  fetchWithAuth,
  loginWithPassword,
  validateStoredSession,
  type AdminProfile,
} from "@/lib/auth-api";
import { clearAuthSession, getAuthSession, isAccessTokenExpired } from "@/lib/auth-storage";

export const SESSION_EXPIRED_MESSAGE =
  "Session expired — sign in again." as const;

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  profile: AdminProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  handleSessionExpired: () => void;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  applyProfile: (profile: AdminProfile) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const handleSessionExpired = useCallback(() => {
    clearAuthSession();
    setProfile(null);
    setStatus("unauthenticated");
    showToast(SESSION_EXPIRED_MESSAGE);
    router.replace("/login?reason=session-expired");
  }, [router, showToast]);

  useEffect(() => {
    let cancelled = false;

    void validateStoredSession().then((nextProfile) => {
      if (cancelled) {
        return;
      }

      if (nextProfile) {
        setProfile(nextProfile);
        setStatus("authenticated");
        return;
      }

      setProfile(null);
      setStatus("unauthenticated");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const onFocus = () => {
      const session = getAuthSession();
      if (!session) {
        handleSessionExpired();
        return;
      }

      if (!isAccessTokenExpired(session)) {
        return;
      }

      void validateStoredSession().then((nextProfile) => {
        if (!nextProfile) {
          handleSessionExpired();
        }
      });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [handleSessionExpired, status]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginWithPassword(email.trim(), password);
    if (!result.ok) {
      setProfile(null);
      setStatus("unauthenticated");
      return false;
    }

    setProfile(result.profile);
    setStatus("authenticated");
    return true;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setProfile(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const authFetch = useCallback(
    (input: string, init?: RequestInit) =>
      fetchWithAuth(input, init, handleSessionExpired),
    [handleSessionExpired]
  );

  const applyProfile = useCallback((nextProfile: AdminProfile) => {
    setProfile(nextProfile);
    setStatus("authenticated");
  }, []);

  const value = useMemo(
    () => ({
      status,
      profile,
      login,
      logout,
      handleSessionExpired,
      authFetch,
      applyProfile,
    }),
    [applyProfile, authFetch, handleSessionExpired, login, logout, profile, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
