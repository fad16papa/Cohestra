export type WebsiteBuilderWorkspaceMode = "build" | "split" | "preview";

/** Minimum viewport width where editor + preview split stays usable. */
export const WORKSPACE_SPLIT_MIN_WIDTH_PX = 1280;

/** Wide screens default to split for simultaneous edit + preview. */
export const WORKSPACE_WIDE_DEFAULT_SPLIT_PX = 1536;

/** Target max editor column width in split mode. */
export const WORKSPACE_SPLIT_EDITOR_MAX_PX = 440;

export function isSplitWorkspaceAvailable(viewportWidth: number): boolean {
  return viewportWidth >= WORKSPACE_SPLIT_MIN_WIDTH_PX;
}

export function getDefaultWorkspaceMode(
  viewportWidth: number,
): WebsiteBuilderWorkspaceMode {
  if (viewportWidth >= WORKSPACE_WIDE_DEFAULT_SPLIT_PX) {
    return "split";
  }

  return "build";
}

export function normalizeWorkspaceMode(
  mode: WebsiteBuilderWorkspaceMode,
  viewportWidth: number,
): WebsiteBuilderWorkspaceMode {
  if (mode === "split" && !isSplitWorkspaceAvailable(viewportWidth)) {
    return "build";
  }

  return mode;
}

export function shouldShowEditorPane(
  mode: WebsiteBuilderWorkspaceMode,
  isMobile: boolean,
  mobileWorkspace: "edit" | "preview",
): boolean {
  if (isMobile) {
    return mobileWorkspace === "edit";
  }

  return mode === "build" || mode === "split";
}

export function shouldShowPreviewPane(
  mode: WebsiteBuilderWorkspaceMode,
  isMobile: boolean,
  mobileWorkspace: "edit" | "preview",
): boolean {
  if (isMobile) {
    return mobileWorkspace === "preview";
  }

  return mode === "preview" || mode === "split";
}
