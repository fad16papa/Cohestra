/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientDetail } from "@/lib/clients-api";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ authFetch: vi.fn() }),
}));

vi.mock("@/components/ui/toast-provider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { ClientMasterFields } from "@/components/clients/client-master-fields";

const client: ClientDetail = {
  id: "client-1",
  fullName: "Amina Tan",
  phone: "+6591234567",
  email: "amina@example.com",
  profession: "Designer",
  nationality: "Singaporean",
  residency: "Singapore",
  consentGiven: true,
  referralSource: "Walk-in",
  notes: "Prefers morning calls",
  leadStatus: "new",
  isMergeSuspect: false,
  nextFollowUpAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  registrationHistory: [],
  timeline: [],
};

function columnsAtSm(grid: Element): number {
  const explicit = grid.className.match(/(?:^|\s)sm:grid-cols-(\d+)(?:\s|$)/);
  let columns = explicit ? Number(explicit[1]) : 1;

  for (const child of Array.from(grid.children)) {
    const span = child.className.match(/(?:^|\s)sm:col-span-(\d+)(?:\s|$)/);
    if (span) {
      columns = Math.max(columns, Number(span[1]));
    }
  }

  return columns;
}

function editGrid(root: ParentNode): HTMLElement {
  const name = root.querySelector("#master-full-name");
  const field = name?.parentElement;
  const grid = field?.parentElement;
  if (!(grid instanceof HTMLElement) || !(field instanceof HTMLElement)) {
    throw new Error("Master Profile edit grid was not rendered.");
  }

  return grid;
}

describe("ClientMasterFields compact edit grid", () => {
  let rootEl: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    rootEl = document.createElement("div");
    document.body.append(rootEl);
    root = createRoot(rootEl);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    rootEl.remove();
  });

  async function renderEditing(compact: boolean) {
    await act(async () => {
      root.render(
        createElement(ClientMasterFields, {
          client,
          compact,
          onUpdated: () => undefined,
        })
      );
    });

    const edit = Array.from(rootEl.querySelectorAll("button")).find(
      (button) => button.textContent === "Edit profile"
    );
    if (!edit) {
      throw new Error("Edit profile button was not rendered.");
    }

    await act(async () => {
      edit.click();
    });

    return editGrid(rootEl);
  }

  it("keeps compact edit fields in one column at sm widths", async () => {
    const grid = await renderEditing(true);
    const name = rootEl.querySelector("#master-full-name")?.parentElement;
    const consent = rootEl.querySelector("#master-consent")?.parentElement;
    const notes = rootEl.querySelector("#master-notes")?.parentElement;
    const contact = rootEl.querySelector("#master-phone-local")?.closest(".space-y-2");
    const email = rootEl.querySelector("#master-email")?.parentElement;

    expect(columnsAtSm(grid)).toBe(1);
    expect(grid.className).not.toMatch(/(?:^|\s)sm:grid-cols-/);
    expect(grid.className).not.toMatch(/(?:^|\s)grid-cols-/);
    expect(name?.className).not.toContain("sm:col-span-2");
    expect(consent?.className).not.toContain("sm:col-span-2");
    expect(notes?.className).not.toContain("sm:col-span-2");
    expect(contact?.parentElement).toBe(grid);
    expect(email?.parentElement).toBe(grid);
    expect(contact?.className).not.toContain("sm:col-span-");
    expect(email?.className).not.toContain("sm:col-span-");
  });

  it("keeps the non-compact desktop spans and the narrow single-column base", async () => {
    const grid = await renderEditing(false);
    const name = rootEl.querySelector("#master-full-name")?.parentElement;
    const consent = rootEl.querySelector("#master-consent")?.parentElement;
    const notes = rootEl.querySelector("#master-notes")?.parentElement;

    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).not.toMatch(/(?:^|\s)grid-cols-/);
    expect(columnsAtSm(grid)).toBe(2);
    expect(name?.className).toContain("sm:col-span-2");
    expect(consent?.className).toContain("sm:col-span-2");
    expect(notes?.className).toContain("sm:col-span-2");
  });
});
