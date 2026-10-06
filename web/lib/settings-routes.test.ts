import { describe, expect, it } from "vitest";

import {
  SETTINGS_APPEARANCE_PATH,
  SETTINGS_BILLING_PATH,
  SETTINGS_PATH,
  SETTINGS_PLAN_PATH,
  SETTINGS_PROFILE_PATH,
  SETTINGS_TEAM_PATH,
} from "@/lib/admin-canonical-routes";
import {
  getDefaultSettingsPath,
  getSettingsRouteMeta,
  isAdminOnlySettingsPath,
  mapLegacySettingsSection,
  resolveSettingsSearchRedirect,
  settingsPathForSectionId,
} from "@/lib/settings-routes";

describe("settings nested routes", () => {
  it("maps current section ids to nested paths", () => {
    expect(settingsPathForSectionId("settings-plan")).toBe(SETTINGS_PLAN_PATH);
    expect(settingsPathForSectionId("settings-account")).toBe(SETTINGS_PROFILE_PATH);
    expect(settingsPathForSectionId("settings-appearance")).toBe(SETTINGS_APPEARANCE_PATH);
    expect(getSettingsRouteMeta("/settings/team")?.label).toBe("Team");
    expect(getSettingsRouteMeta("/settings/billing")?.label).toBe("Billing");
    expect(getSettingsRouteMeta("/settings/profile")?.label).toBe("Your account");
    expect(getSettingsRouteMeta("/settings/teem")).toBeNull();
  });

  it("uses plan as the Admin default and profile as the Member default", () => {
    expect(getDefaultSettingsPath(true)).toBe(SETTINGS_PLAN_PATH);
    expect(getDefaultSettingsPath(false)).toBe(SETTINGS_PROFILE_PATH);
  });

  it("maps legacy section and activeId aliases", () => {
    expect(mapLegacySettingsSection("account")).toBe(SETTINGS_PROFILE_PATH);
    expect(mapLegacySettingsSection("settings-account")).toBe(SETTINGS_PROFILE_PATH);
    expect(mapLegacySettingsSection("TEAM")).toBe(SETTINGS_TEAM_PATH);
    expect(mapLegacySettingsSection("billing")).toBe(SETTINGS_BILLING_PATH);
    expect(mapLegacySettingsSection("settings-plan")).toBe(SETTINGS_PLAN_PATH);
    expect(mapLegacySettingsSection("not-a-section")).toBeNull();
  });

  it("replace-maps legacy search onto nested paths and strips section keys", () => {
    expect(
      resolveSettingsSearchRedirect(
        SETTINGS_PATH,
        new URLSearchParams("section=team"),
        true
      )
    ).toBe(SETTINGS_TEAM_PATH);
    expect(
      resolveSettingsSearchRedirect(
        SETTINGS_PATH,
        new URLSearchParams("section=account"),
        true
      )
    ).toBe(SETTINGS_PROFILE_PATH);
    expect(
      resolveSettingsSearchRedirect(
        SETTINGS_PROFILE_PATH,
        new URLSearchParams("section=appearance"),
        true
      )
    ).toBe(SETTINGS_APPEARANCE_PATH);
    expect(
      resolveSettingsSearchRedirect(
        SETTINGS_PATH,
        new URLSearchParams("activeId=appearance&utm=1"),
        false
      )
    ).toBe(`${SETTINGS_APPEARANCE_PATH}?utm=1`);
    expect(
      resolveSettingsSearchRedirect(
        SETTINGS_BILLING_PATH,
        new URLSearchParams("billing=incomplete&session_id=txn_1"),
        true
      )
    ).toBeNull();
  });

  it("waits for role before defaulting /settings and then replace-navigates", () => {
    expect(
      resolveSettingsSearchRedirect(SETTINGS_PATH, new URLSearchParams(), null)
    ).toBeNull();
    expect(
      resolveSettingsSearchRedirect(SETTINGS_PATH, new URLSearchParams(), true)
    ).toBe(SETTINGS_PLAN_PATH);
    expect(
      resolveSettingsSearchRedirect(SETTINGS_PATH, new URLSearchParams(), false)
    ).toBe(SETTINGS_PROFILE_PATH);
  });

  it("treats workspace areas as admin-only except Billing's own gate", () => {
    expect(isAdminOnlySettingsPath(SETTINGS_PLAN_PATH)).toBe(true);
    expect(isAdminOnlySettingsPath(SETTINGS_TEAM_PATH)).toBe(true);
    expect(isAdminOnlySettingsPath(SETTINGS_BILLING_PATH)).toBe(false);
    expect(isAdminOnlySettingsPath(SETTINGS_PROFILE_PATH)).toBe(false);
    expect(isAdminOnlySettingsPath(SETTINGS_APPEARANCE_PATH)).toBe(false);
  });
});
