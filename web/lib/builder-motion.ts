/** Shared CSS-token motion for Website Studio and Form Studio. */

export const BUILDER_CONTEXT_ENTER_CLASS = "builder-context-enter";
export const BUILDER_TAB_ENTER_CLASS = "builder-tab-enter";
export const BUILDER_PRESENCE_ENTER_CLASS = "builder-presence-enter";
export const BUILDER_SELECTION_CLASS = "builder-selection";

export type BuilderMotionLevel = "context" | "tab" | "presence";

export const BUILDER_MOTION_LEVEL_CLASS: Record<BuilderMotionLevel, string> = {
  context: BUILDER_CONTEXT_ENTER_CLASS,
  tab: BUILDER_TAB_ENTER_CLASS,
  presence: BUILDER_PRESENCE_ENTER_CLASS,
};

/**
 * Live preview trees must unmount while the operator is editing.
 * Never keep-mount WebsiteLivePreview or RegistrationPublicPreviewShell.
 */
export function shouldKeepBuilderPreviewMounted(): false {
  return false;
}

export function builderSurfaceEnterClass(
  level: BuilderMotionLevel,
  active: boolean,
): string | undefined {
  return active ? BUILDER_MOTION_LEVEL_CLASS[level] : undefined;
}
