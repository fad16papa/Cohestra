"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { resolveSettingsSearchRedirect } from "@/lib/settings-routes";

function SettingsIndexRedirectBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shell } = useTenantShell();

  useEffect(() => {
    const destination = resolveSettingsSearchRedirect(
      "/settings",
      new URLSearchParams(searchParams.toString()),
      shell ? shell.isTenantAdmin : null
    );
    if (destination) {
      router.replace(destination);
    }
  }, [router, searchParams, shell]);

  return <p className="text-sm text-text-muted-warm">Loading settings…</p>;
}

export function SettingsIndexRedirect() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading settings…</p>}>
      <SettingsIndexRedirectBody />
    </Suspense>
  );
}
