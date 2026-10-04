import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FORM_STUDIO_INSPECTOR_ID,
  FORM_STUDIO_THREE_PANE_MIN_PX,
  FORM_STUDIO_TWO_PANE_MIN_PX,
  getFormStudioComposition,
  isInspectorToggleExpanded,
  resolveInspectorAfterResize,
  shouldShowDockedInspector,
  shouldShowInspectorToggle,
  shouldUseInspectorSheet,
} from "@/lib/form-studio-workspace";

const BUILDER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/activities/form-composition-builder.tsx"),
  "utf8"
);

describe("form studio workspace contract", () => {
  it("treats 1023 as stacked and 1024 as two-pane", () => {
    expect(getFormStudioComposition(FORM_STUDIO_TWO_PANE_MIN_PX - 1)).toBe(
      "stacked"
    );
    expect(getFormStudioComposition(FORM_STUDIO_TWO_PANE_MIN_PX)).toBe(
      "two-pane"
    );
  });

  it("treats 1279 as two-pane and 1280 as three-pane", () => {
    expect(getFormStudioComposition(FORM_STUDIO_THREE_PANE_MIN_PX - 1)).toBe(
      "two-pane"
    );
    expect(getFormStudioComposition(FORM_STUDIO_THREE_PANE_MIN_PX)).toBe(
      "three-pane"
    );
  });

  it("keeps palette and canvas persistent; inspector is the collapsing surface", () => {
    expect(shouldShowDockedInspector("three-pane", false)).toBe(true);
    expect(shouldShowDockedInspector("two-pane", false)).toBe(false);
    expect(shouldShowDockedInspector("two-pane", true)).toBe(true);
    expect(shouldShowDockedInspector("stacked", true)).toBe(false);
    expect(shouldUseInspectorSheet("stacked")).toBe(true);
    expect(shouldUseInspectorSheet("two-pane")).toBe(false);
    expect(shouldShowInspectorToggle("three-pane")).toBe(false);
    expect(shouldShowInspectorToggle("two-pane")).toBe(true);
    expect(shouldShowInspectorToggle("stacked")).toBe(true);
  });

  it("reports aria-expanded from the active inspector surface", () => {
    expect(isInspectorToggleExpanded("three-pane", false, false)).toBe(true);
    expect(isInspectorToggleExpanded("two-pane", false, true)).toBe(false);
    expect(isInspectorToggleExpanded("two-pane", true, false)).toBe(true);
    expect(isInspectorToggleExpanded("stacked", true, false)).toBe(false);
    expect(isInspectorToggleExpanded("stacked", false, true)).toBe(true);
  });

  it("rehomes an open inspector across the 1024 Sheet boundary", () => {
    expect(
      resolveInspectorAfterResize({
        previous: "stacked",
        next: "two-pane",
        inspectorOpen: false,
        sheetOpen: true,
      })
    ).toEqual({ inspectorOpen: true, sheetOpen: false });

    expect(
      resolveInspectorAfterResize({
        previous: "two-pane",
        next: "stacked",
        inspectorOpen: true,
        sheetOpen: false,
      })
    ).toEqual({ inspectorOpen: false, sheetOpen: true });

    expect(
      resolveInspectorAfterResize({
        previous: "three-pane",
        next: "stacked",
        inspectorOpen: false,
        sheetOpen: false,
      })
    ).toEqual({ inspectorOpen: false, sheetOpen: true });

    expect(
      resolveInspectorAfterResize({
        previous: "three-pane",
        next: "two-pane",
        inspectorOpen: false,
        sheetOpen: false,
      })
    ).toEqual({ inspectorOpen: true, sheetOpen: false });
  });
});

describe("form studio workspace source contract", () => {
  it("does not remount the builder from a viewport key", () => {
    expect(BUILDER_SOURCE).not.toMatch(/key=\{[^}]*viewport/i);
    expect(BUILDER_SOURCE).not.toMatch(/key=\{[^}]*composition/i);
  });

  it("uses CSS xl for three panes and lg for two panes, not lg as 1280", () => {
    expect(BUILDER_SOURCE).toContain(
      "xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]"
    );
    expect(BUILDER_SOURCE).toContain(
      "lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
    );
    expect(BUILDER_SOURCE).toContain("lg:max-xl:hidden");
    expect(BUILDER_SOURCE).toContain("getLiveFormStudioComposition");
    expect(BUILDER_SOURCE).not.toContain(
      "lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]"
    );
    expect(BUILDER_SOURCE).toContain(FORM_STUDIO_INSPECTOR_ID);
  });

  it("reuses the Story 38.6 Sheet primitive", () => {
    expect(BUILDER_SOURCE).toContain('from "@/components/ui/sheet"');
    expect(BUILDER_SOURCE).toContain("<Sheet");
    expect(BUILDER_SOURCE).toContain("SheetContent");
  });
});
