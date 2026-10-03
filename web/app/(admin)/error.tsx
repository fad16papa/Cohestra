"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorScreen surface="admin" ownsMain={false} error={error} reset={reset} />;
}
