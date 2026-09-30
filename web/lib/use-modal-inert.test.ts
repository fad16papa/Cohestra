/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vitest";

import { acquireModalInert, resetModalInertForTests } from "@/lib/use-modal-inert";

describe("modal background inert", () => {
  afterEach(() => {
    resetModalInertForTests();
    document.body.replaceChildren();
  });

  it("marks non-portal body children inert while a modal is held", async () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-admin-shell", "");
    const portal = document.createElement("div");
    portal.setAttribute("data-base-ui-portal", "");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    portal.append(dialog);
    document.body.append(shell, portal);

    const release = acquireModalInert();
    expect(shell.hasAttribute("inert")).toBe(true);
    expect(portal.hasAttribute("inert")).toBe(false);

    const late = document.createElement("nextjs-portal");
    document.body.append(late);
    await Promise.resolve();
    expect(late.hasAttribute("inert")).toBe(true);

    release();
    expect(shell.hasAttribute("inert")).toBe(false);
  });

  it("keeps the lock until the last overlay releases", () => {
    const shell = document.createElement("div");
    document.body.append(shell);
    const first = acquireModalInert();
    const second = acquireModalInert();
    expect(shell.hasAttribute("inert")).toBe(true);
    first();
    expect(shell.hasAttribute("inert")).toBe(true);
    second();
    expect(shell.hasAttribute("inert")).toBe(false);
  });
});
