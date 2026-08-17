"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { isPlatformAdminProfile } from "@/lib/auth-api";

type AdminRouteGuardProps = {
  children: ReactNode;
};

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const { status, profile } = useAuth();
  const isPlatformAdmin = profile ? isPlatformAdminProfile(profile) : false;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && isPlatformAdmin) {
      router.replace("/platform");
    }
  }, [isPlatformAdmin, router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Loading admin workspace…</p>
      </div>
    );
  }

  if (status === "unauthenticated" || isPlatformAdmin) {
    return null;
  }

  return children;
}
