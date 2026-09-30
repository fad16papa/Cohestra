"use client";

import { useLayoutEffect } from "react";

const holders = new Set<symbol>();
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

function ensureObserver(): void {
  if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }
  observer = new MutationObserver(() => {
    syncModalInert();
  });
  observer.observe(document.body, { childList: true });
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
  for (const child of Array.from(document.body.children)) {
    if (!lock) {
      child.removeAttribute("inert");
      continue;
    }
    if (isOverlayPortal(child)) {
      child.removeAttribute("inert");
    } else {
      child.setAttribute("inert", "");
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
