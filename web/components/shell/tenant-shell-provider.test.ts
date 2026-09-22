import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const providerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "tenant-shell-provider.tsx"),
  "utf8"
);

describe("TenantShellProvider billing-sync regression", () => {
  it("does not auto-reconcile billing on ordinary shell mount or focus", () => {
    expect(providerSource).not.toContain("billing/sync");
    expect(providerSource).not.toContain("cohestra_billing_sync");
    expect(providerSource).not.toContain("syncBillingFromProvider");
    expect(providerSource).not.toContain("reconcileBillingFromProvider");
    expect(providerSource).not.toContain("@/lib/billing/billing-api");
  });
});
