"use client";

import { useEffect, useState } from "react";

import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import type { RouteBoundarySurface } from "@/lib/route-boundary";

type RouteErrorScreenProps = {
  surface: RouteBoundarySurface;
  ownsMain: boolean;
  error: Error & { digest?: string };
  reset: () => void;
};

export function RouteErrorScreen({
  surface,
  ownsMain,
  error,
  reset,
}: RouteErrorScreenProps) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (error.digest) {
      console.error("route-boundary", error.digest);
    }
  }, [error.digest]);

  return (
    <RouteBoundaryState
      kind={online ? "error" : "offline"}
      surface={surface}
      ownsMain={ownsMain}
      reset={reset}
    />
  );
}
