import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relative: string): string {
  return readFileSync(resolve(import.meta.dirname, relative), "utf8");
}

describe("Story 38.6 overlay source contract", () => {
  it("keeps slotted dialogs on 160ms local motion with PRM-safe data slots", () => {
    const dialog = source("../components/ui/dialog.tsx");
    const alert = source("../components/ui/alert-dialog.tsx");
    const sheet = source("../components/ui/sheet.tsx");
    expect(dialog).toContain('data-slot="dialog"');
    expect(dialog).toContain("duration-[160ms]");
    expect(dialog).toContain("initialFocus");
    expect(dialog).toContain("finalFocus");
    expect(dialog).toContain("trapOverlayTab");
    expect(alert).toContain("trapOverlayTab");
    expect(sheet).toContain("trapOverlayTab");
    expect(alert).toContain('from "@base-ui/react/alert-dialog"');
    expect(alert).toContain("duration-[160ms]");
    expect(alert).not.toContain("@base-ui/react/dialog");
    expect(sheet).toContain("duration-[160ms]");
    expect(sheet).toContain("size-11 min-h-11 min-w-11");
    expect(sheet).toContain("Close");
  });

  it("migrates command palette, email preview, and insert QR onto ui/dialog", () => {
    const palette = source("../components/layouts/admin-command-palette.tsx");
    const preview = source("../components/campaigns/email-preview-dialog.tsx");
    const qr = source("../components/campaigns/insert-qr-modal.tsx");
    expect(palette).toContain("<Dialog");
    expect(palette).toContain("Command palette");
    expect(palette).toContain("initialFocus={inputRef}");
    expect(palette).not.toMatch(/role=["']dialog["']/);
    expect(preview).toContain("<Dialog");
    expect(preview).toContain("Email preview");
    expect(preview).not.toMatch(/role=["']dialog["']/);
    expect(qr).toContain("<Dialog");
    expect(qr).toContain("Insert activity QR code");
    expect(qr).toContain("initialFocus={searchRef}");
    expect(qr).not.toMatch(/role=["']dialog["']/);
  });

  it("restores More-sheet focus to the More button and keeps shell modals exclusive", () => {
    const tabs = source("../components/layouts/admin-mobile-tab-bar.tsx");
    const sheet = source("../components/layouts/admin-nav-sheet.tsx");
    const shell = source("../components/layouts/admin-shell-context.tsx");
    expect(tabs).toContain("moreButtonRef");
    expect(tabs).toContain('aria-haspopup="dialog"');
    expect(tabs).toContain("navSheetOpen");
    expect(tabs).toContain("setNavSheetOpen");
    expect(sheet).toContain("restoreFocusRef");
    expect(sheet).toContain("finalFocus={restoreFocus ? restoreFocusRef : undefined}");
    expect(shell).toContain("navSheetOpen");
    expect(shell).toContain("hasBlockingPageModal");
  });

  it("keeps named custom-dialog exceptions out of the 38.6 migration set", () => {
    expect(source("../components/marketing/marketing-cookie-consent.tsx")).toMatch(
      /role=["']dialog["']/
    );
    expect(source("../components/dashboard/activity-calendar-popout.tsx")).toMatch(
      /role=["']dialog["']/
    );
    expect(source("../components/website/website-builder-onboarding-tour.tsx")).toMatch(
      /role=["']dialog["']/
    );
    expect(source("../components/activities/form-field-palette-dialog.tsx")).toMatch(
      /role=["']dialog["']/
    );
  });

  it("maps overlay surfaces in forced-colors so boundaries stay perceivable", () => {
    const tokens = source("../styles/brand-tokens.css");
    expect(tokens).toContain("@media (forced-colors: active)");
    expect(tokens).toContain('[data-slot="dialog-content"]');
    expect(tokens).toContain('[data-slot="alert-dialog-content"]');
    expect(tokens).toContain('[data-slot="sheet-content"]');
    expect(tokens).toContain("border: 1px solid ButtonText");
    expect(tokens).toContain("--popover: Canvas");
  });
});
