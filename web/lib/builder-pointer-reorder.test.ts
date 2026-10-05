import { describe, expect, it } from "vitest";

import {
  resolveDropIndexFromPoint,
  shouldStartHandlePointerDrag,
} from "@/lib/builder-pointer-reorder";

describe("builder pointer reorder", () => {
  it("starts pointer drag only for touch or pen on the primary button", () => {
    expect(shouldStartHandlePointerDrag("touch", 0, false)).toBe(true);
    expect(shouldStartHandlePointerDrag("pen", 0, false)).toBe(true);
    expect(shouldStartHandlePointerDrag("mouse", 0, false)).toBe(false);
    expect(shouldStartHandlePointerDrag("touch", 1, false)).toBe(false);
    expect(shouldStartHandlePointerDrag("touch", 0, true)).toBe(false);
  });

  it("returns null when document is unavailable", () => {
    expect(resolveDropIndexFromPoint(0, 0, "data-form-studio-row-index")).toBeNull();
  });
});
