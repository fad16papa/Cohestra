"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";

import {
  BUILDER_MOTION_LEVEL_CLASS,
  type BuilderMotionLevel,
} from "@/lib/builder-motion";
import { cn } from "@/lib/utils";

type BuilderSurfaceProps = {
  children: ReactNode;
  active: boolean;
  /** Keep children mounted while inactive (editor/build only — never live preview). */
  keepMounted?: boolean;
  level?: BuilderMotionLevel;
} & Omit<ComponentProps<"div">, "children">;

/**
 * Local builder enter wrapper. Does not remount keep-mounted children.
 * Put this on studio panes — never wrap with AdminRouteTransition.
 */
export function BuilderSurface({
  children,
  active,
  keepMounted = false,
  level = "context",
  className,
  ...props
}: BuilderSurfaceProps) {
  const skipInitialEnterRef = useRef(Boolean(keepMounted && active));

  if (!active) {
    skipInitialEnterRef.current = false;
  }

  if (!active && !keepMounted) {
    return null;
  }

  const playEnter = active && !skipInitialEnterRef.current;

  return (
    <div
      {...props}
      data-builder-surface=""
      data-builder-level={level}
      data-builder-active={active ? "true" : "false"}
      data-builder-keep-mounted={keepMounted ? "true" : "false"}
      hidden={!active}
      className={cn(
        "min-w-0",
        playEnter && BUILDER_MOTION_LEVEL_CLASS[level],
        className,
      )}
    >
      {children}
    </div>
  );
}
