"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorScreen surface="marketing" ownsMain error={error} reset={reset} />;
}
