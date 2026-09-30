type TabEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
  currentTarget: EventTarget | null;
};

export function getOverlayTabbables(root: HTMLElement): HTMLElement[] {
  const nodes = [
    ...root.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    ),
  ].filter(
    (element) =>
      !element.hasAttribute("data-base-ui-focus-guard") &&
      !element.closest("[data-base-ui-focus-guard]") &&
      element.tabIndex >= 0 &&
      !element.hasAttribute("disabled")
  );

  if (root.tabIndex >= 0 && !nodes.includes(root)) {
    return [root, ...nodes];
  }
  return nodes;
}

export function trapOverlayTab(event: TabEvent): void {
  if (event.key !== "Tab") {
    return;
  }
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const tabbables = getOverlayTabbables(root);
  if (tabbables.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }

  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === root || !root.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !root.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
