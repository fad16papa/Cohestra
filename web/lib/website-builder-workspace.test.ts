import { describe, expect, it } from "vitest";

import {
  getDefaultWorkspaceMode,
  isSplitWorkspaceAvailable,
  normalizeWorkspaceMode,
  shouldShowEditorPane,
  shouldShowPreviewPane,
  WORKSPACE_SPLIT_MIN_WIDTH_PX,
  WORKSPACE_WIDE_DEFAULT_SPLIT_PX,
} from "@/lib/website-builder-workspace";

describe("website builder workspace", () => {
  it("defaults to build on laptop widths", () => {
    expect(getDefaultWorkspaceMode(1024)).toBe("build");
    expect(getDefaultWorkspaceMode(WORKSPACE_SPLIT_MIN_WIDTH_PX - 1)).toBe(
      "build",
    );
  });

  it("defaults to split on very wide desktops", () => {
    expect(getDefaultWorkspaceMode(WORKSPACE_WIDE_DEFAULT_SPLIT_PX)).toBe(
      "split",
    );
  });

  it("normalizes split away when viewport is too narrow", () => {
    expect(normalizeWorkspaceMode("split", 1100)).toBe("build");
    expect(normalizeWorkspaceMode("split", WORKSPACE_SPLIT_MIN_WIDTH_PX)).toBe(
      "split",
    );
  });

  it("reports split availability from viewport width", () => {
    expect(isSplitWorkspaceAvailable(1279)).toBe(false);
    expect(isSplitWorkspaceAvailable(WORKSPACE_SPLIT_MIN_WIDTH_PX)).toBe(true);
  });

  it("shows editor and preview panes per desktop workspace mode", () => {
    expect(shouldShowEditorPane("build", false, "edit")).toBe(true);
    expect(shouldShowPreviewPane("build", false, "edit")).toBe(false);
    expect(shouldShowEditorPane("split", false, "edit")).toBe(true);
    expect(shouldShowPreviewPane("split", false, "edit")).toBe(true);
    expect(shouldShowEditorPane("preview", false, "edit")).toBe(false);
    expect(shouldShowPreviewPane("preview", false, "edit")).toBe(true);
  });

  it("maps mobile edit/preview to pane visibility", () => {
    expect(shouldShowEditorPane("build", true, "edit")).toBe(true);
    expect(shouldShowPreviewPane("build", true, "edit")).toBe(false);
    expect(shouldShowEditorPane("build", true, "preview")).toBe(false);
    expect(shouldShowPreviewPane("build", true, "preview")).toBe(true);
  });
});
