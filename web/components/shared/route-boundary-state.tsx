"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  ROUTE_RETRY_LABEL,
  routeBoundaryCopy,
  routeBoundaryHeading,
  routeBoundaryRecovery,
  routeBoundaryUsesPublicTouch,
  type RouteBoundaryKind,
  type RouteBoundarySurface,
} from "@/lib/route-boundary";
import { cn } from "@/lib/utils";

export type RouteBoundaryStateProps = {
  kind: RouteBoundaryKind;
  surface: RouteBoundarySurface;
  ownsMain?: boolean;
  reset?: () => void;
};

export function RouteBoundaryState({
  kind,
  surface,
  ownsMain = false,
  reset,
}: RouteBoundaryStateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const heading = routeBoundaryHeading(kind);
  const copy = routeBoundaryCopy(kind, surface);
  const recovery = routeBoundaryRecovery(surface);
  const publicTouch = routeBoundaryUsesPublicTouch(surface);
  const actionClass = publicTouch
    ? "min-h-12 min-w-12 px-5"
    : "min-h-11 min-w-11 px-4";

  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, [kind, heading]);

  const body = (
    <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col items-start gap-4 py-8 sm:py-12">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="break-words text-display-sm text-text-warm outline-none"
      >
        {heading}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-text-muted-warm">{copy}</p>
      <div className="flex flex-wrap items-center gap-3">
        {reset ? (
          <Button type="button" onClick={reset} className={actionClass}>
            {ROUTE_RETRY_LABEL}
          </Button>
        ) : null}
        <Link
          href={recovery.href}
          className={cn(buttonVariants({ variant: reset ? "outline" : "default" }), actionClass)}
        >
          {recovery.label}
        </Link>
      </div>
    </div>
  );

  if (ownsMain) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-5 sm:px-8">{body}</main>
    );
  }

  return body;
}
