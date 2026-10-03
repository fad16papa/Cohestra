"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorScreen surface="platform" ownsMain={false} error={error} reset={reset} />;
}
