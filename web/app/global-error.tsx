"use client";

import { RouteErrorScreen } from "@/components/shared/route-error-screen";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <RouteErrorScreen surface="global" ownsMain error={error} reset={reset} />
      </body>
    </html>
  );
}
