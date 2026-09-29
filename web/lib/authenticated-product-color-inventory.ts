import fs from "node:fs";
import path from "node:path";

import { AUTHENTICATED_PRODUCT_GLOBS } from "@/lib/semantic-text-tokens";

export type ColorInventoryKind =
  | "stone-token"
  | "gold-token"
  | "text-lagoon"
  | "text-primary"
  | "hex-text"
  | "tailwind-palette-text"
  | "opacity-text";

export type ColorInventoryDisposition =
  | "migrated"
  | "passing-intentionally-retained"
  | "decorative"
  | "outside-38-4"
  | "unresolved-failure";

export type ColorInventoryRow = {
  file: string;
  line: number;
  kind: ColorInventoryKind;
  snippet: string;
  disposition: ColorInventoryDisposition;
  ownerStory: string;
  note: string;
};

const TEXT_LAGOON = /\btext-lagoon(?!-fg)\b/;
const TEXT_PRIMARY = /\btext-primary(?!-foreground)\b/;
const TEXT_STONE = /\b(?:placeholder:)?text-stone\b/;
const TEXT_GOLD = /\btext-gold(?!-soft|-cinema)\b/;
const HEX_TEXT = /\btext-\[[#][0-9a-fA-F]{3,8}\]/;
const TAILWIND_PALETTE_TEXT =
  /\btext-(?:red|emerald|green|blue|amber|yellow|orange|gray|slate|zinc|neutral|stone)-\d{2,3}\b/;
const OPACITY_TEXT =
  /\b(?:text-(?:ink|foreground|muted|stone|lagoon|gold|primary|destructive|success|warning)(?:-[a-z]+)?|placeholder:text-[a-z-]+)\/\d{1,3}\b/;

function walkTsx(dir: string, files: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsx(full, files);
      continue;
    }
    if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
}

function classify(
  kind: ColorInventoryKind,
  snippet: string,
  relative: string
): Pick<ColorInventoryRow, "disposition" | "ownerStory" | "note"> {
  if (kind === "text-lagoon") {
    return {
      disposition: "unresolved-failure",
      ownerStory: "38.4",
      note: "Authenticated-product text-lagoon must be text-text-link or proven decorative.",
    };
  }

  if (kind === "text-primary") {
    return {
      disposition: "unresolved-failure",
      ownerStory: "38.4",
      note: "Dark --primary is fill-only. Ordinary text/links/icons must use --text-link.",
    };
  }

  if (kind === "stone-token") {
    if (snippet.includes("text-disabled") || snippet.includes("--text-disabled")) {
      return {
        disposition: "passing-intentionally-retained",
        ownerStory: "38.4",
        note: "Disabled text may use stone (1.4.3 exempt).",
      };
    }
    if (TEXT_STONE.test(snippet)) {
      return {
        disposition: "unresolved-failure",
        ownerStory: "38.4",
        note: "text-stone is not allowed as helper/body in authenticated product UI.",
      };
    }
    return {
      disposition: "decorative",
      ownerStory: "38.4",
      note: "Palette --stone referenced without being body/helper text.",
    };
  }

  if (kind === "gold-token") {
    if (TEXT_GOLD.test(snippet)) {
      return {
        disposition: "unresolved-failure",
        ownerStory: "38.4",
        note: "text-gold is not allowed as helper/body in authenticated product UI.",
      };
    }
    return {
      disposition: "decorative",
      ownerStory: "38.4",
      note: "Palette --gold / gold-soft atmosphere or fill.",
    };
  }

  if (kind === "hex-text") {
    return {
      disposition: "unresolved-failure",
      ownerStory: "38.4",
      note: "Raw hexadecimal text color in authenticated product UI.",
    };
  }

  if (kind === "tailwind-palette-text") {
    if (relative.includes("share-link-preview")) {
      return {
        disposition: "decorative",
        ownerStory: "outside-38-4",
        note: "WhatsApp/message facsimile, not product chrome.",
      };
    }
    if (relative.includes("email-preview-dialog") && /text-blue-/.test(snippet)) {
      return {
        disposition: "outside-38-4",
        ownerStory: "email-html-facsimile",
        note: "Campaign HTML preview mimics email client link color.",
      };
    }
    if (/text-red-\d/.test(snippet)) {
      return {
        disposition: "unresolved-failure",
        ownerStory: "38.4",
        note: "Raw red-* text in authenticated product; use --text-danger / surface-danger.",
      };
    }
    if (/text-emerald-\d|text-green-\d/.test(snippet)) {
      return {
        disposition: "passing-intentionally-retained",
        ownerStory: "38.4",
        note: "Success status chrome still on Tailwind emerald. Not a proven <4.5 fail; prefer --text-success / --surface-success.",
      };
    }
    if (/text-amber-\d|text-yellow-\d/.test(snippet)) {
      return {
        disposition: "passing-intentionally-retained",
        ownerStory: "38.4",
        note: "Warning chrome on Tailwind amber. Prefer --text-warning / --surface-warning. Retained when the pair is not a proven WCAG fail.",
      };
    }
    return {
      disposition: "passing-intentionally-retained",
      ownerStory: "38.4",
      note: "Tailwind palette text recorded; not a proven contrast fail.",
    };
  }

  if (kind === "opacity-text") {
    if (/text-primary\//.test(snippet) && !/text-primary-foreground/.test(snippet)) {
      return {
        disposition: "unresolved-failure",
        ownerStory: "38.4",
        note: "Opacity-based primary text is not a passing dark-mode body/link pair.",
      };
    }
    if (relative.includes("marketing") || relative.includes("demo-mount")) {
      return {
        disposition: "outside-38-4",
        ownerStory: "marketing-frozen",
        note: "Marketing/cinema opacity text is outside 38.4.",
      };
    }
    return {
      disposition: "passing-intentionally-retained",
      ownerStory: "38.4",
      note: "Opacity utility recorded; contrast must still pass via the resolved token.",
    };
  }

  return {
    disposition: "outside-38-4",
    ownerStory: "unknown",
    note: "Unclassified.",
  };
}

function collectMatches(
  source: string,
  relative: string,
  pattern: RegExp,
  kind: ColorInventoryKind,
  rows: ColorInventoryRow[]
): void {
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    if (!pattern.test(line)) {
      return;
    }
    const classified = classify(kind, line.trim(), relative);
    rows.push({
      file: relative,
      line: index + 1,
      kind,
      snippet: line.trim().slice(0, 220),
      ...classified,
    });
  });
}

export function scanAuthenticatedProductColorInventory(
  webRoot: string
): ColorInventoryRow[] {
  const files: string[] = [];
  for (const glob of AUTHENTICATED_PRODUCT_GLOBS) {
    walkTsx(path.join(webRoot, glob), files);
  }

  const rows: ColorInventoryRow[] = [];
  for (const file of files.sort()) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(webRoot, file).replaceAll("\\", "/");
    collectMatches(source, relative, TEXT_LAGOON, "text-lagoon", rows);
    collectMatches(source, relative, TEXT_PRIMARY, "text-primary", rows);
    collectMatches(source, relative, /(?:--stone\b|text-stone|text-disabled)/, "stone-token", rows);
    collectMatches(source, relative, /(?:--gold\b|text-gold|bg-gold|border-gold)/, "gold-token", rows);
    collectMatches(source, relative, HEX_TEXT, "hex-text", rows);
    collectMatches(source, relative, TAILWIND_PALETTE_TEXT, "tailwind-palette-text", rows);
    collectMatches(source, relative, OPACITY_TEXT, "opacity-text", rows);
  }
  return rows;
}

export function inventoryHasUnresolvedFailures(rows: ColorInventoryRow[]): ColorInventoryRow[] {
  return rows.filter((row) => row.disposition === "unresolved-failure");
}
