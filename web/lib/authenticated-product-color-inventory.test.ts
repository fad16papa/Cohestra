import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  inventoryHasUnresolvedFailures,
  scanAuthenticatedProductColorInventory,
} from "@/lib/authenticated-product-color-inventory";

const webRoot = path.resolve(__dirname, "..");
const evidenceDir = path.resolve(
  webRoot,
  "../_bmad-output/planning-artifacts/evidence/px2-38-4"
);

describe("authenticated product color inventory", () => {
  it("has no unresolved Story 38.4 contrast failures", () => {
    const rows = scanAuthenticatedProductColorInventory(webRoot);
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, "color-inventory.json"),
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          story: "38.4",
          rows,
          unresolved: inventoryHasUnresolvedFailures(rows),
        },
        null,
        2
      )
    );

    const unresolved = inventoryHasUnresolvedFailures(rows);
    expect(unresolved, JSON.stringify(unresolved, null, 2)).toEqual([]);
    expect(rows.some((row) => row.kind === "text-lagoon")).toBe(false);
    expect(rows.some((row) => row.kind === "text-primary")).toBe(false);
    expect(rows.some((row) => row.kind === "hex-text")).toBe(false);
  });
});
