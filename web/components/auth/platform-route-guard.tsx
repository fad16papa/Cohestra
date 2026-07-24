"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { ROLES } from "@/lib/auth-api";

type PlatformRouteGuardProps = {
  children: ReactNode;
};

export function PlatformRouteGuard({ children }: PlatformRouteGuardProps) {
  const router = useRouter();
  const { status, profile } = useAuth();
  const isPlatformAdmin = profile?.roles.includes(ROLES.PlatformAdmin) ?? false;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && profile && !isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [isPlatformAdmin, profile, router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-sm text-[var(--plat-stone)]">Loading platform console…</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !isPlatformAdmin) {
    return null;
  }

  return children;
}
