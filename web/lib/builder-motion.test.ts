import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BUILDER_CONTEXT_ENTER_CLASS,
  BUILDER_MOTION_LEVEL_CLASS,
  BUILDER_PRESENCE_ENTER_CLASS,
  BUILDER_SELECTION_CLASS,
  BUILDER_TAB_ENTER_CLASS,
  builderSurfaceEnterClass,
  shouldKeepBuilderPreviewMounted,
} from "@/lib/builder-motion";

const GLOBALS_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../app/globals.css"),
  "utf8"
);
const SURFACE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/motion/builder-surface.tsx"),
  "utf8"
);
const FORM_STUDIO_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/activities/activity-form-tab.tsx"),
  "utf8"
);
const FORM_BUILDER_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/activities/form-composition-builder.tsx"
  ),
  "utf8"
);
const DESIGN_TAB_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/activities/activity-design-tab.tsx"
  ),
  "utf8"
);
const PREVIEW_SHELL_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/registration/registration-public-preview-shell.tsx"
  ),
  "utf8"
);
const WEBSITE_PAGE_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/website/website-builder-page.tsx"
  ),
  "utf8"
);
const WEBSITE_RAIL_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/website/website-builder-editor-rail.tsx"
  ),
  "utf8"
);
const WEBSITE_SECTIONS_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/website/website-section-fields.tsx"
  ),
  "utf8"
);
const WEBSITE_PREVIEW_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/website/website-live-preview.tsx"
  ),
  "utf8"
);
const DIALOG_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/dialog.tsx"),
  "utf8"
);
const SHEET_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/sheet.tsx"),
  "utf8"
);
const POPOVER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/popover.tsx"),
  "utf8"
);
const ALERT_DIALOG_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/alert-dialog.tsx"),
  "utf8"
);

describe("builder motion tokens", () => {
  it("maps levels to CSS class names", () => {
    expect(BUILDER_MOTION_LEVEL_CLASS.context).toBe("builder-context-enter");
    expect(builderSurfaceEnterClass("tab", true)).toBe(BUILDER_TAB_ENTER_CLASS);
    expect(builderSurfaceEnterClass("presence", false)).toBeUndefined();
    expect(BUILDER_SELECTION_CLASS).toBe("builder-selection");
    expect(BUILDER_PRESENCE_ENTER_CLASS).toBe("builder-presence-enter");
    expect(BUILDER_CONTEXT_ENTER_CLASS).toBe("builder-context-enter");
  });

  it("never keep-mounts live preview trees", () => {
    expect(shouldKeepBuilderPreviewMounted()).toBe(false);
  });

  it("defines builder enter classes and reduced-motion disable in globals", () => {
    expect(GLOBALS_SOURCE).toContain(".builder-context-enter");
    expect(GLOBALS_SOURCE).toContain(".builder-tab-enter");
    expect(GLOBALS_SOURCE).toContain(".builder-presence-enter");
    expect(GLOBALS_SOURCE).toContain(".builder-selection");
    expect(GLOBALS_SOURCE).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.builder-context-enter/
    );
    expect(GLOBALS_SOURCE).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.builder-selection/
    );
    const selectionRule = GLOBALS_SOURCE.match(
      /\.builder-selection\s*\{[^}]+\}/
    )?.[0];
    expect(selectionRule).toContain("box-shadow, border-color, background-color");
    expect(selectionRule).not.toContain("transform");
  });
});

describe("BuilderSurface primitive", () => {
  it("does not remount keep-mounted children and does not use forbidden APIs", () => {
    expect(SURFACE_SOURCE).toContain("keepMounted");
    expect(SURFACE_SOURCE).toContain("skipInitialEnterRef");
    expect(SURFACE_SOURCE).toContain("min-w-0");
    expect(SURFACE_SOURCE).not.toContain("overflow-x-clip");
    expect(SURFACE_SOURCE).not.toContain("dangerouslySetInnerHTML");
    expect(SURFACE_SOURCE).not.toContain("startViewTransition");
    expect(SURFACE_SOURCE).not.toContain("framer-motion");
  });
});

describe("Form Studio motion integration", () => {
  it("keep-mounts Build and unmounts Preview", () => {
    expect(FORM_STUDIO_SOURCE).toContain("BuilderSurface");
    expect(FORM_STUDIO_SOURCE).toContain('active={formStudioMode === "build"}');
    expect(FORM_STUDIO_SOURCE).toContain("keepMounted");
    expect(FORM_STUDIO_SOURCE).toContain(
      'active={formStudioMode === "preview"}'
    );
    expect(FORM_STUDIO_SOURCE).toContain("keepMounted={false}");
    expect(FORM_STUDIO_SOURCE).not.toContain("AdminRouteTransition");
    expect(FORM_STUDIO_SOURCE).not.toContain("key={formStudioMode}");
  });

  it("keeps draft ownership and delayed preview identity", () => {
    expect(FORM_STUDIO_SOURCE).toContain('useState<FormStudioMode>("build")');
    expect(FORM_STUDIO_SOURCE).toContain("buildFormStudioPreviewKey");
    expect(FORM_STUDIO_SOURCE).toContain("useDebouncedValue");
    expect(FORM_STUDIO_SOURCE).toContain("formSchema={draftSchema}");
  });

  it("uses selection/presence tokens without canvas scale", () => {
    expect(FORM_BUILDER_SOURCE).toContain("BUILDER_SELECTION_CLASS");
    expect(FORM_BUILDER_SOURCE).toContain("BUILDER_PRESENCE_ENTER_CLASS");
    expect(FORM_BUILDER_SOURCE).not.toContain("scale-");
    expect(DESIGN_TAB_SOURCE).toContain("BUILDER_SELECTION_CLASS");
  });

  it("keeps Preview submission simulated", () => {
    expect(PREVIEW_SHELL_SOURCE).toContain('variant="preview"');
    expect(PREVIEW_SHELL_SOURCE).toContain("RegistrationPreviewViewportToggle");
    expect(PREVIEW_SHELL_SOURCE).not.toContain("variant=\"live\"");
  });
});

describe("Website Studio motion integration", () => {
  it("keep-mounts the editor and unmounts in-studio Preview while building", () => {
    expect(WEBSITE_PAGE_SOURCE).toContain("BuilderSurface");
    expect(WEBSITE_PAGE_SOURCE).toContain("active={showEditor}");
    expect(WEBSITE_PAGE_SOURCE).toContain("keepMounted");
    expect(WEBSITE_PAGE_SOURCE).toContain("active={showPreview}");
    expect(WEBSITE_PAGE_SOURCE).toContain("keepMounted={false}");
    expect(WEBSITE_PAGE_SOURCE).toContain("shouldShowPreviewPane");
    expect(WEBSITE_PAGE_SOURCE).not.toContain("AdminRouteTransition");
    expect(WEBSITE_PAGE_SOURCE).not.toContain("key={workspaceMode}");
    expect(WEBSITE_PAGE_SOURCE).toContain("onWorkspaceModeChange={setWorkspaceMode}");
    expect(WEBSITE_PAGE_SOURCE).toContain("overflow-x-clip");
  });

  it("does not persist drafts when switching in-studio workspace mode", () => {
    const workspaceSetter = WEBSITE_PAGE_SOURCE.match(
      /onWorkspaceModeChange=\{setWorkspaceMode\}/
    );
    expect(workspaceSetter).not.toBeNull();
    expect(WEBSITE_PAGE_SOURCE).toContain("async function handlePreview");
    expect(WEBSITE_PAGE_SOURCE).toContain("Save draft before opening preview.");
  });

  it("uses local tab enter on editor rails and selection on sections", () => {
    expect(WEBSITE_RAIL_SOURCE).toContain("BuilderSurface");
    expect(WEBSITE_RAIL_SOURCE).toContain('level="tab"');
    expect(WEBSITE_RAIL_SOURCE).toContain("keepMounted");
    expect(WEBSITE_SECTIONS_SOURCE).toContain("BUILDER_SELECTION_CLASS");
    expect(WEBSITE_SECTIONS_SOURCE).toContain("BUILDER_PRESENCE_ENTER_CLASS");
    expect(WEBSITE_SECTIONS_SOURCE).not.toContain("scale-");
  });

  it("fades preview device frames without transform on the scaled canvas wrapper", () => {
    expect(WEBSITE_PREVIEW_SOURCE).toContain("BUILDER_TAB_ENTER_CLASS");
    expect(WEBSITE_PREVIEW_SOURCE).toContain('deviceMode === "phone"');
    expect(WEBSITE_PREVIEW_SOURCE).toContain("overflow-x-clip");
  });
});

describe("builder overlay reduced motion", () => {
  it("disables overlay transitions under reduced motion", () => {
    expect(DIALOG_SOURCE).toContain("motion-reduce:transition-none");
    expect(ALERT_DIALOG_SOURCE).toContain("motion-reduce:transition-none");
    expect(SHEET_SOURCE).toContain("motion-reduce:transition-none");
    expect(POPOVER_SOURCE).toContain("motion-reduce:animate-none");
    expect(GLOBALS_SOURCE).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\[data-slot="dialog-content"\]/
    );
  });
});
