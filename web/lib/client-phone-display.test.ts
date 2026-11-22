/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ClientPhoneDisplay } from "@/components/clients/client-phone-display";

function accessibleText(root: ParentNode): string {
  const texts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("[aria-hidden='true']")) {
      texts.push(node.textContent ?? "");
    }
    node = walker.nextNode();
  }
  return texts.join("").replace(/\s+/g, " ").trim();
}

describe("ClientPhoneDisplay master profile", () => {
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

  it("announces the country and full number once", async () => {
    await act(async () => {
      root.render(
        createElement(ClientPhoneDisplay, {
          phone: "+6591234567",
          layout: "master-profile",
        })
      );
    });

    const spoken = accessibleText(rootEl);
    expect(spoken).toBe("Singapore +65 9123 4567");
    expect(spoken.match(/\+65/g)).toHaveLength(1);
    expect(spoken.match(/9123 4567/g)).toHaveLength(1);

    const visible = rootEl.querySelector("[data-contact-layout='flag-prefix-number']");
    expect(visible?.textContent).toContain("|");
    expect(visible?.textContent).toContain("+65");
    expect(visible?.textContent).toContain("-");
    expect(visible?.textContent).toContain("9123 4567");
    expect(visible?.querySelector("[data-contact-separator='prefix']")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(visible?.querySelector("[data-contact-separator='number']")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
  });

  it("leaves the default phone display readable without the master-profile layout", async () => {
    await act(async () => {
      root.render(createElement(ClientPhoneDisplay, { phone: "+6591234567" }));
    });

    expect(rootEl.querySelector("[data-contact-layout='flag-prefix-number']")).toBeNull();
    expect(rootEl.textContent).toContain("+65");
    expect(rootEl.textContent).toContain("9123 4567");
  });
});
