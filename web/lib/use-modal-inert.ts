"use client";

import { useLayoutEffect } from "react";

const holders = new Set<symbol>();
/** Elements this utility made inert → original `inert` attribute value (`null` if it was absent). */
const owned = new Map<Element, string | null>();
let observer: MutationObserver | null = null;

export function resetModalInertForTests(): void {
  holders.clear();
  observer?.disconnect();
  observer = null;
  syncModalInert();
}

function isOverlayPortal(node: Element): boolean {
  if (node.tagName === "NEXTJS-PORTAL") {
    return false;
  }
  if (node.hasAttribute("data-base-ui-portal")) {
    return true;
  }
  return Boolean(
    node.querySelector(
      "[data-slot='dialog-content'], [data-slot='alert-dialog-content'], [data-slot='sheet-content']"
    )
  );
}

function restoreOwned(element: Element): void {
  if (!owned.has(element)) {
    return;
  }
  const original = owned.get(element) ?? null;
  owned.delete(element);
  if (original == null) {
    element.removeAttribute("inert");
    return;
  }
  element.setAttribute("inert", original);
}

function claimBackground(element: Element): void {
  if (owned.has(element)) {
    if (!element.hasAttribute("inert")) {
      element.setAttribute("inert", "");
    }
    return;
  }
  if (element.hasAttribute("inert")) {
    return;
  }
  owned.set(element, null);
  element.setAttribute("inert", "");
}

function ensureObserver(): void {
  if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }
  observer = new MutationObserver(() => {
    syncModalInert();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function teardownObserverIfIdle(): void {
  if (holders.size > 0) {
    return;
  }
  observer?.disconnect();
  observer = null;
}

function syncModalInert(): void {
  if (typeof document === "undefined") {
    return;
  }

  const lock = holders.size > 0;
  if (!lock) {
    for (const element of [...owned.keys()]) {
      restoreOwned(element);
    }
    return;
  }

  const bodyChildren = new Set(Array.from(document.body.children));
  for (const element of [...owned.keys()]) {
    if (!bodyChildren.has(element)) {
      restoreOwned(element);
    }
  }

  for (const child of bodyChildren) {
    if (isOverlayPortal(child)) {
      restoreOwned(child);
    } else {
      claimBackground(child);
    }
  }
}

export function acquireModalInert(): () => void {
  const id = Symbol("modal-inert");
  holders.add(id);
  ensureObserver();
  syncModalInert();
  return () => {
    holders.delete(id);
    syncModalInert();
    teardownObserverIfIdle();
  };
}

export function useModalInert(open: boolean): void {
  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    return acquireModalInert();
  }, [open]);
}
