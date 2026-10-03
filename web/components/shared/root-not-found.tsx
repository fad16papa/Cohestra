"use client";

import { usePathname } from "next/navigation";

import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import {
  routeBoundaryOwnsMain,
  routeBoundarySurfaceFromPath,
} from "@/lib/route-boundary";

export function RootNotFound() {
  const pathname = usePathname() ?? "/";
  const surface = routeBoundarySurfaceFromPath(pathname);
  return (
    <RouteBoundaryState
      kind="not-found"
      surface={surface}
      ownsMain={routeBoundaryOwnsMain(surface) || surface === "admin" || surface === "platform" || surface === "public"}
    />
  );
}
