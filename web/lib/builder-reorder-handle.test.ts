import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const HANDLE_SOURCE = readFileSync(
  resolve(__dirname, "../components/builder/builder-reorder-handle.tsx"),
  "utf8"
);
const BUILDER_SOURCE = readFileSync(
  resolve(__dirname, "../components/activities/form-composition-builder.tsx"),
  "utf8"
);
const WEBSITE_SOURCE = readFileSync(
  resolve(__dirname, "../components/website/website-section-fields.tsx"),
  "utf8"
);

describe("builder reorder handle source contract", () => {
  it("uses a 44px explicit handle named Reorder {item}", () => {
    expect(HANDLE_SOURCE).toContain("min-h-11");
    expect(HANDLE_SOURCE).toContain("min-w-11");
    expect(HANDLE_SOURCE).toContain("touch-none");
    expect(HANDLE_SOURCE).toContain("Reorder ${itemName}");
    expect(HANDLE_SOURCE).not.toContain("Drag to reorder");
  });

  it("keeps Form Studio HTML5 mouse drag and pointer touch on the shared handle", () => {
    expect(BUILDER_SOURCE).toContain("BuilderReorderHandle");
    expect(BUILDER_SOURCE).toContain("shouldStartHandlePointerDrag");
    expect(BUILDER_SOURCE).toContain("attachPointerListeners");
    expect(BUILDER_SOURCE).toContain("setPointerCapture");
    expect(BUILDER_SOURCE).toContain("reorderCompositionBlocks");
    expect(BUILDER_SOURCE).toContain('aria-label={`Move ${blockTitle(node, schema)} up`}');
    expect(BUILDER_SOURCE).not.toContain("size=\"icon-xs\"");
    expect(BUILDER_SOURCE).not.toContain("key={viewport");
  });

  it("applies the same handle to Website section rows without a new DnD library", () => {
    expect(WEBSITE_SOURCE).toContain("BuilderReorderHandle");
    expect(WEBSITE_SOURCE).not.toContain("@dnd-kit");
    expect(WEBSITE_SOURCE).toContain("startPointerDrag");
    expect(WEBSITE_SOURCE).toContain("ArrowUp");
  });
});
