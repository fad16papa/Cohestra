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
  });

  it("PublicRegistrationOpen guards overflow on public surfaces", () => {
    const source = readFileSync(
      join(process.cwd(), "components/registration/public-registration-open.tsx"),
      "utf8"
    );
    expect(source).toMatch(/overflow-x-hidden/);
    expect(source).toMatch(/min-w-0/);
  });
});
