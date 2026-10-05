import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const formTab = readFileSync(
  join(process.cwd(), "components/activities/activity-form-tab.tsx"),
  "utf8"
);
const picker = readFileSync(
  join(process.cwd(), "components/activities/form-template-picker.tsx"),
  "utf8"
);
const composition = readFileSync(
  join(process.cwd(), "components/activities/form-composition-builder.tsx"),
  "utf8"
);
const previewShell = readFileSync(
  join(process.cwd(), "components/registration/registration-public-preview-shell.tsx"),
  "utf8"
);
const previewOpen = readFileSync(
  join(process.cwd(), "components/registration/public-registration-open.tsx"),
  "utf8"
);
const publishControls = readFileSync(
  join(process.cwd(), "components/activities/activity-publish-controls.tsx"),
  "utf8"
);
const websitePage = readFileSync(
  join(process.cwd(), "components/website/website-builder-page.tsx"),
  "utf8"
);
const websiteDialog = readFileSync(
  join(process.cwd(), "components/website/website-publish-success-dialog.tsx"),
  "utf8"
);
const surface = readFileSync(
  join(process.cwd(), "components/motion/builder-surface.tsx"),
  "utf8"
);

describe("Story 42.4 — remaining Creation Studio continuity", () => {
  it("keeps draft Preview and unmounts the public tree while Build is active", () => {
    expect(formTab).toContain("formSchema={draftSchema}");
    expect(formTab).toContain('active={formStudioMode === "preview"}');
    expect(formTab).toContain("keepMounted={false}");
    expect(formTab).not.toContain("key={formStudioMode}");
    expect(formTab).not.toMatch(/display:\s*none/);
    expect(surface).toContain("if (!active && !keepMounted)");
    expect(surface).toContain("return null");
    expect(previewShell).toContain('variant="preview"');
    expect(previewOpen).toContain("simulateRegistrationPreviewSubmit");
  });

  it("names Form Preview and does not add an iframe renderer", () => {
    expect(previewShell).toContain('role="region"');
    expect(previewShell).toContain('aria-label="Registration preview"');
    expect(previewShell).not.toContain("<iframe");
    expect(formTab).not.toMatch(/FormStudioPreviewRendererV2/);
  });

  it("compacts Templates and jumps to composition", () => {
    expect(picker).toContain("compactDefault");
    expect(picker).toContain("useState(!compactDefault)");
    expect(picker).toContain("open={templatesOpen}");
    expect(formTab).toContain("compactDefault={draftSchema.fields.length > 0}");
    expect(formTab).toContain('href="#form-studio-composition"');
    expect(formTab).toContain("Go to composition");
    expect(composition).toContain('id="form-studio-composition"');
    expect(composition).toContain(">Form builder</h2>");
  });

  it("reverts unsaved Form draft locally without a publish API", () => {
    expect(formTab).toContain("Revert unsaved");
    expect(formTab).toContain("handleRevertUnsaved");
    expect(formTab).toContain("setDraftSchema(normalizeFormSchema(activity.formSchema))");
    expect(formTab).not.toMatch(/handleRevertUnsaved[\s\S]*publishActivity/);
    expect(formTab).not.toMatch(/handleRevertUnsaved[\s\S]*unpublishActivity/);
  });

  it("keeps Form publish success persistent and Website 42.1 success dialog", () => {
    expect(publishControls).toContain('setSuccess("Activity is live.")');
    expect(publishControls).toContain('role="status"');
    expect(publishControls).toContain('role="alert"');
    expect(websitePage).toContain("keepMounted={false}");
    expect(websiteDialog).toContain("Your homepage is live");
  });
});
