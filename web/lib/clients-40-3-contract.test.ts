import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FOLLOW_UP_PATH } from "@/lib/admin-canonical-routes";
import { openInFollowUpHref, shouldOfferOpenInFollowUp } from "@/lib/follow-up-category";

const LIST_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/clients-list-page.tsx"),
  "utf8"
);
const PAGE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../app/(admin)/clients/page.tsx"),
  "utf8"
);
const TABLE_LAYOUT_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/clients-table-layout.ts"),
  "utf8"
);
const PROFILE_MOTION_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-profile-motion.tsx"),
  "utf8"
);
const PROFILE_HEADER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-profile-header.tsx"),
  "utf8"
);
const ROW_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-row.tsx"),
  "utf8"
);
const PHONE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-phone-display.tsx"),
  "utf8"
);

describe("Story 40.3 Clients contracts", () => {
  it("uses a semantic table and does not remount the list on searchParams", () => {
    expect(LIST_SOURCE).toContain("<table");
    expect(LIST_SOURCE).toContain("<thead>");
    expect(LIST_SOURCE).toContain("<tbody>");
    expect(LIST_SOURCE).toContain('scope="col"');
    expect(LIST_SOURCE).not.toContain('role="row"');
    expect(LIST_SOURCE).not.toContain('role="columnheader"');
    expect(LIST_SOURCE).not.toContain("followUpCategory");
    expect(PAGE_SOURCE).not.toContain("key={searchParams}");
  });

  it("does not force a 42rem desktop min-width trap", () => {
    expect(TABLE_LAYOUT_SOURCE).not.toContain("min-w-[42rem]");
    expect(TABLE_LAYOUT_SOURCE).toContain("md:table");
    expect(LIST_SOURCE).toContain('className="divide-y divide-border-warm md:hidden"');
  });

  it("does not clip Clients table status labels with the community 5.5rem column", () => {
    expect(TABLE_LAYOUT_SOURCE).toContain("clientsSemanticTableStatusClassName");
    expect(TABLE_LAYOUT_SOURCE).toContain('export const clientsSemanticTableStatusClassName = "min-w-0"');
    expect(ROW_SOURCE).toContain("clientsSemanticTableStatusClassName");
    const rowStart = ROW_SOURCE.indexOf('if (variant === "row")');
    const rowEnd = ROW_SOURCE.indexOf("const card =");
    const rowVariantBlock = ROW_SOURCE.slice(rowStart, rowEnd);
    expect(rowStart).toBeGreaterThan(-1);
    expect(rowEnd).toBeGreaterThan(rowStart);
    expect(rowVariantBlock).toContain("clientsSemanticTableStatusClassName");
    expect(rowVariantBlock).not.toContain("clientsTableStatusColumnClassName");
  });

  it("keeps profile expand on 160ms local motion with no 200ms local interaction", () => {
    expect(PROFILE_MOTION_SOURCE).toContain("motion-local");
    expect(PROFILE_MOTION_SOURCE).toContain("duration-[160ms]");
    expect(PROFILE_MOTION_SOURCE).toContain("motion-reduce:transition-none");
    expect(PROFILE_MOTION_SOURCE).not.toContain("duration-200");
    expect(PHONE_SOURCE).not.toContain("duration-200");
    expect(PROFILE_HEADER_SOURCE).not.toContain("duration-200");
  });

  it("opens Follow-up on the canonical Due-now room without a client query", () => {
    expect(openInFollowUpHref()).toBe(FOLLOW_UP_PATH);
    expect(openInFollowUpHref()).toBe("/follow-up");
    expect(PROFILE_HEADER_SOURCE).toContain("Open in Follow-up");
    expect(PROFILE_HEADER_SOURCE).toContain("openInFollowUpHref()");
    expect(PROFILE_HEADER_SOURCE).not.toContain("clientId");
    expect(shouldOfferOpenInFollowUp({ leadStatus: "new", nextFollowUpAt: null, lastOutreachAt: null })).toBe(
      true
    );
  });
});
