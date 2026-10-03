import { notFound } from "next/navigation";

import { E2eForceErrorClient } from "@/components/e2e/e2e-force-error-client";
import { isForceErrorBlocked } from "@/lib/route-boundary";

export function E2eForceErrorPage() {
  if (isForceErrorBlocked()) {
    notFound();
  }

  return <E2eForceErrorClient />;
}
