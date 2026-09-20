import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("form studio design tab contract", () => {
  it("ActivityDesignTab wires experience controls and canonical preview theme save", () => {
    const designSource = readFileSync(
      join(process.cwd(), "components/activities/activity-design-tab.tsx"),
      "utf8"
    );
    expect(designSource).toMatch(/RegistrationExperienceControls/);
    expect(designSource).toMatch(/RegistrationDesignTokenControls/);
    expect(designSource).toMatch(/registrationThemeForSave/);
    expect(designSource).toMatch(/resolveRegistrationPreviewTheme/);
    expect(designSource).not.toMatch(/Preview Mode/);
  });

  it("RegistrationForm applies design tokens in Preview and public", () => {
    const formSource = readFileSync(
      join(process.cwd(), "components/registration/registration-form.tsx"),
      "utf8"
    );
    expect(formSource).toMatch(/tokenFieldClass = designTokens/);
    expect(formSource).toMatch(/publicSubmitClass = designTokens/);
    expect(formSource).toMatch(/publicFormTypographyClass = designTokens/);
    expect(formSource).toMatch(/publicFormSpacingClass = designTokens/);
    expect(formSource).not.toMatch(/isPublic && designTokens/);
  });

  it("ActivityFormTab preview uses shared design draft theme", () => {
    const formSource = readFileSync(
      join(process.cwd(), "components/activities/activity-form-tab.tsx"),
      "utf8"
    );
    expect(formSource).toMatch(/designDraftTheme/);
    expect(formSource).toMatch(/buildFormStudioPreviewKey\(draftSchema, previewThemeSource\)/);
    expect(formSource).toMatch(/useDebouncedValue/);
    expect(formSource).toMatch(/remountKey=\{previewKey\}/);
    expect(formSource).not.toMatch(/<RegistrationPublicPreviewShell\s+key=\{previewKey\}/);
  });
});
