import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { filterDisabledColorContrast } from "../../lib/axe-disabled-contrast";

/**
 * Run Axe with disabled controls included. Color-contrast is filtered only for
 * genuinely disabled / aria-disabled / data-disabled nodes.
 */
export async function analyzeAxe(
  page: Page,
  options?: { include?: string | string[]; extraExcludes?: string[] }
) {
  let builder = new AxeBuilder({ page });
  if (options?.include) {
    const include = Array.isArray(options.include) ? options.include : [options.include];
    for (const selector of include) {
      builder = builder.include(selector);
    }
  }
  for (const selector of options?.extraExcludes ?? []) {
    builder = builder.exclude(selector);
  }
  const results = await builder.analyze();
  return {
    ...results,
    violations: filterDisabledColorContrast(results.violations),
  };
}
