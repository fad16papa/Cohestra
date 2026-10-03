"use client";

import { useState } from "react";

import { E2E_FORCE_ERROR_MESSAGE } from "@/lib/route-boundary";

export function E2eForceErrorClient() {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) {
    throw new Error(E2E_FORCE_ERROR_MESSAGE);
  }

  return (
    <button type="button" data-testid="e2e-force-error-trigger" onClick={() => setShouldThrow(true)}>
      Trigger test error
    </button>
  );
}
