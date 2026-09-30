/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vitest";

import { acquireModalInert, resetModalInertForTests } from "@/lib/use-modal-inert";

async function flushObserver(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function dialogSlot(): HTMLDivElement {
  const content = document.createElement("div");
  content.setAttribute("data-slot", "dialog-content");
  return content;
}

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
    await flushObserver();
    expect(late.hasAttribute("inert")).toBe(true);

    release();
    expect(shell.hasAttribute("inert")).toBe(false);
    expect(late.hasAttribute("inert")).toBe(false);
  });

  it("leaves a pre-inert body child inert after modal close", () => {
    const preexisting = document.createElement("div");
    preexisting.setAttribute("inert", "true");
    const shell = document.createElement("div");
    document.body.append(preexisting, shell);

    const release = acquireModalInert();
    expect(preexisting.getAttribute("inert")).toBe("true");
    expect(shell.hasAttribute("inert")).toBe(true);

    release();
    expect(preexisting.hasAttribute("inert")).toBe(true);
    expect(preexisting.getAttribute("inert")).toBe("true");
    expect(shell.hasAttribute("inert")).toBe(false);
  });

  it("makes a newly managed child inert and restores it on close", () => {
    const shell = document.createElement("div");
    document.body.append(shell);
    expect(shell.hasAttribute("inert")).toBe(false);

    const release = acquireModalInert();
    expect(shell.hasAttribute("inert")).toBe(true);

    release();
    expect(shell.hasAttribute("inert")).toBe(false);
  });

  it("releases only utility-owned inert when an empty portal is later populated", async () => {
    const managedPortal = document.createElement("div");
    const foreignPortal = document.createElement("div");
    foreignPortal.setAttribute("inert", "");
    document.body.append(managedPortal, foreignPortal);

    const release = acquireModalInert();
    expect(managedPortal.hasAttribute("inert")).toBe(true);
    expect(foreignPortal.hasAttribute("inert")).toBe(true);

    managedPortal.append(dialogSlot());
    foreignPortal.append(dialogSlot());
    await flushObserver();

    expect(managedPortal.hasAttribute("inert")).toBe(false);
    expect(foreignPortal.hasAttribute("inert")).toBe(true);

    release();
    expect(managedPortal.hasAttribute("inert")).toBe(false);
    expect(foreignPortal.hasAttribute("inert")).toBe(true);
  });

  it("keeps the lock until the last overlay releases", () => {
    const preexisting = document.createElement("div");
    preexisting.setAttribute("inert", "");
    const shell = document.createElement("div");
    document.body.append(preexisting, shell);

    const first = acquireModalInert();
    const second = acquireModalInert();
    expect(shell.hasAttribute("inert")).toBe(true);
    expect(preexisting.hasAttribute("inert")).toBe(true);

    first();
    expect(shell.hasAttribute("inert")).toBe(true);
    expect(preexisting.hasAttribute("inert")).toBe(true);

    second();
    expect(shell.hasAttribute("inert")).toBe(false);
    expect(preexisting.hasAttribute("inert")).toBe(true);
  });

  it("does not strip unrelated inert during test reset", () => {
    const unrelated = document.createElement("div");
    unrelated.setAttribute("inert", "");
    const shell = document.createElement("div");
    document.body.append(unrelated, shell);

    acquireModalInert();
    expect(shell.hasAttribute("inert")).toBe(true);
    expect(unrelated.hasAttribute("inert")).toBe(true);

    resetModalInertForTests();
    expect(unrelated.hasAttribute("inert")).toBe(true);
    expect(shell.hasAttribute("inert")).toBe(false);
  });
});
