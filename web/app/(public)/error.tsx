"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorScreen surface="public" ownsMain={false} error={error} reset={reset} />;
}
