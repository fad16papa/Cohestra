/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import { getOverlayTabbables, trapOverlayTab } from "@/lib/overlay-tab-trap";

describe("overlay tab trap", () => {
  it("cycles Tab from the last control back to the first", () => {
    const root = document.createElement("div");
    root.tabIndex = 0;
    const first = document.createElement("button");
    first.textContent = "One";
    const last = document.createElement("button");
    last.textContent = "Two";
    root.append(first, last);
    document.body.append(root);
    last.focus();

    let prevented = false;
    trapOverlayTab({
      key: "Tab",
      shiftKey: false,
      currentTarget: root,
      preventDefault: () => {
        prevented = true;
      },
    });

    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(root);
    expect(getOverlayTabbables(root)).toEqual([root, first, last]);
    root.remove();
  });
});
