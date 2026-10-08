import { describe, expect, it } from "vitest";

import { filterDisabledColorContrast } from "@/lib/axe-disabled-contrast";

describe("filterDisabledColorContrast", () => {
  it("keeps non-contrast failures on disabled unnamed controls", () => {
    const filtered = filterDisabledColorContrast([
      {
        id: "button-name",
        nodes: [{ html: '<button disabled class="opacity-50"></button>' }],
      },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("button-name");
  });

  it("keeps invalid ARIA on disabled controls", () => {
    const filtered = filterDisabledColorContrast([
      {
        id: "aria-allowed-attr",
        nodes: [{ html: '<input disabled aria-checked="maybe">' }],
      },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("aria-allowed-attr");
  });

  it("filters contrast-only findings whose target is disabled or aria-disabled", () => {
    const filtered = filterDisabledColorContrast([
      {
        id: "color-contrast",
        nodes: [
          { html: '<button disabled class="text-stone">Save</button>' },
          { html: '<button aria-disabled="true">Next</button>' },
        ],
      },
    ]);
    expect(filtered).toEqual([]);
  });

  it("keeps color-contrast failures on enabled controls", () => {
    const filtered = filterDisabledColorContrast([
      {
        id: "color-contrast",
        nodes: [{ html: '<a class="text-stone" href="/signup">Start free</a>' }],
      },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.nodes).toHaveLength(1);
  });

  it("keeps enabled contrast nodes when mixed with disabled nodes", () => {
    const filtered = filterDisabledColorContrast([
      {
        id: "color-contrast",
        nodes: [
          { html: '<button disabled>Off</button>' },
          { html: '<button class="text-stone">On</button>' },
        ],
      },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.nodes).toEqual([{ html: '<button class="text-stone">On</button>' }]);
  });
});
