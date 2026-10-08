export type AxeViolationNode = {
  html: string;
};

export type AxeViolationLike = {
  id: string;
  nodes: AxeViolationNode[];
};

function nodeLooksDisabled(html: string): boolean {
  const markup = html.toLowerCase();
  if (/(?:^|\s)disabled(?:\s|=|\/|>)/.test(markup)) {
    return true;
  }
  if (markup.includes('aria-disabled="true"') || markup.includes("aria-disabled='true'")) {
    return true;
  }
  if (
    /(?:^|\s)data-disabled(?:\s|=|\/|>)/.test(markup) &&
    !markup.includes('data-disabled="false"') &&
    !markup.includes("data-disabled='false'")
  ) {
    return true;
  }
  return false;
}

/**
 * WCAG 1.4.3 exempts inactive controls from contrast. Keep every other rule,
 * and keep contrast failures on enabled controls.
 */
export function filterDisabledColorContrast<T extends AxeViolationLike>(violations: T[]): T[] {
  return violations.flatMap((violation) => {
    if (violation.id !== "color-contrast") {
      return [violation];
    }
    const nodes = violation.nodes.filter((node) => !nodeLooksDisabled(node.html));
    if (nodes.length === 0) {
      return [];
    }
    return [{ ...violation, nodes }];
  });
}
