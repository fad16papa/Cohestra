import type { ReactNode } from "react";

import { ADMIN_ROUTE_ENTER_CLASS } from "@/lib/admin-route-motion";
import { cn } from "@/lib/utils";

type AdminRouteTransitionProps = {
  children: ReactNode;
  className?: string;
};

/** Pathname-keyed enter wrapper. Put `key={adminRouteTransitionKey(pathname)}` on this component from the parent. */
export function AdminRouteTransition({
  children,
  className,
}: AdminRouteTransitionProps) {
  return (
    <div
      data-admin-route-transition=""
      className={cn(ADMIN_ROUTE_ENTER_CLASS, "min-w-0 overflow-x-clip", className)}
    >
      {children}
    </div>
  );
}
