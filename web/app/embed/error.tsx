"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorScreen surface="embed" ownsMain error={error} reset={reset} />;
}
