"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { exchangeAuthHandoff } from "@/lib/auth-handoff";
import { fetchSessionProfile } from "@/lib/auth-api";
import { setAuthSession } from "@/lib/auth-storage";

function AuthHandoffHandlerContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applyProfile } = useAuth();
  const [pending, setPending] = useState(
    () => (searchParams.get("handoff")?.trim().length ?? 0) > 0
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handoffCode = searchParams.get("handoff")?.trim();
    if (!handoffCode) {
      setPending(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const session = await exchangeAuthHandoff(handoffCode);
      if (cancelled) {
        return;
      }

      if (!session) {
        setFailed(true);
        setPending(false);
        return;
      }

      setAuthSession(session);
      try {
        const profile = await fetchSessionProfile(session.accessToken);
        if (cancelled) {
          return;
        }

        applyProfile(profile);
        const url = new URL(window.location.href);
        url.searchParams.delete("handoff");
        router.replace(`${url.pathname}${url.search}${url.hash}`);
        setPending(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyProfile, router, searchParams]);

  if (pending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
        <p className="text-sm text-destructive">
          This sign-in link expired. Go back to sign in and try again.
        </p>
      </div>
    );
  }

  return children;
}

export function AuthHandoffHandler({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
          <p className="text-sm text-muted-foreground">Opening your workspace…</p>
        </div>
      }
    >
      <AuthHandoffHandlerContent>{children}</AuthHandoffHandlerContent>
    </Suspense>
  );
}
