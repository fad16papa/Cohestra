import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lightweight layout contract checks — public renderer uses bounded width and overflow guards.
 */
describe("registration responsive layout contract", () => {
  it("PublicFormLayout constrains width and prevents horizontal overflow", () => {
    const source = readFileSync(
      join(process.cwd(), "components/layouts/public-form-layout.tsx"),
      "utf8"
    );
    expect(source).toMatch(/max-w-\[480px\]/);
    expect(source).toMatch(/overflow-x-hidden/);
    expect(source).toMatch(/min-w-0/);
  });

  it("RegistrationPublicPreviewShell desktop preview matches public max width", () => {
    const source = readFileSync(
      join(process.cwd(), "components/registration/registration-public-preview-shell.tsx"),
      "utf8"
    );
    expect(source).toMatch(/max-w-\[480px\]/);
    expect(source).toMatch(/max-w-\[960px\]/);
  });

  it("PublicRegistrationOpen passes conversational flowMode to RegistrationForm", () => {
    const openSource = readFileSync(
      join(process.cwd(), "components/registration/public-registration-open.tsx"),
      "utf8"
    );
    const formSource = readFileSync(
      join(process.cwd(), "components/registration/registration-form.tsx"),
      "utf8"
    );
    expect(openSource).toMatch(/registrationFlowMode/);
    expect(openSource).toMatch(/flowMode=\{registrationFlowMode\}/);
    expect(formSource).toMatch(/flowMode === "conversational"/);
    expect(formSource).toMatch(/listConversationalSteps/);
    expect(formSource).toMatch(/firstInvalidIndex/);
  });

  it("Event Poster shell uses poster panel and shared form section", () => {
    const source = readFileSync(
      join(process.cwd(), "components/registration/public-registration-open.tsx"),
      "utf8"
    );
    expect(source).toMatch(/event-poster/);
    expect(source).toMatch(/RegistrationPosterExperiencePanel/);
  });

  it("Split Event shell uses responsive grid collapse", () => {
    const source = readFileSync(
      join(process.cwd(), "components/registration/public-registration-open.tsx"),
      "utf8"
    );
    expect(source).toMatch(/split-event/);
    expect(source).toMatch(/lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
    expect(source).toMatch(/RegistrationSplitExperiencePanel/);
    expect(source).toMatch(/w-screen/);
  });

  it("PublicRegistrationOpen guards overflow on public surfaces", () => {
    const source = readFileSync(
      join(process.cwd(), "components/registration/public-registration-open.tsx"),
      "utf8"
    );
    expect(source).toMatch(/overflow-x-hidden/);
    expect(source).toMatch(/min-w-0/);
    expect(source).toMatch(/pickRegistrationPublicShellKind/);
    expect(source).toMatch(/max-w-\[480px\]/);
  });

  it("PublicFormLayout main does not flex-grow (footer follows content)", () => {
    const source = readFileSync(
      join(process.cwd(), "components/layouts/public-form-layout.tsx"),
      "utf8"
    );
    expect(source).not.toMatch(/main className="[^"]*flex-1/);
  });
});
