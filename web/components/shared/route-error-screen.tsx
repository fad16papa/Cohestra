"use client";

import { useEffect, useRef, useState } from "react";

import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import {
  shouldAutoResetOnReconnect,
  type RouteBoundarySurface,
} from "@/lib/route-boundary";

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
  const wasOnlineRef = useRef(online);
  const hasAutoResetRef = useRef(false);

  useEffect(() => {
    const apply = (nextOnline: boolean) => {
      if (
        shouldAutoResetOnReconnect({
          wasOnline: wasOnlineRef.current,
          isOnline: nextOnline,
          hasAutoReset: hasAutoResetRef.current,
        })
      ) {
        hasAutoResetRef.current = true;
        reset();
      }
      wasOnlineRef.current = nextOnline;
      setOnline(nextOnline);
    };

    apply(typeof navigator === "undefined" ? true : navigator.onLine);
    const onOnline = () => apply(true);
    const onOffline = () => apply(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [reset]);

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
