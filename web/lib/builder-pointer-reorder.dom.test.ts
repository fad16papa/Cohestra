/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  FORM_STUDIO_ROW_INDEX_ATTR,
  resolveDropIndexFromPoint,
} from "@/lib/builder-pointer-reorder";

describe("resolveDropIndexFromPoint", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("reads the canvas row index under the point", () => {
    const row = document.createElement("div");
    row.setAttribute(FORM_STUDIO_ROW_INDEX_ATTR, "2");
    document.body.appendChild(row);
    const original = document.elementFromPoint;
    document.elementFromPoint = (x: number, y: number) =>
      x < 50 && y < 50 ? row : null;

    expect(resolveDropIndexFromPoint(10, 10, FORM_STUDIO_ROW_INDEX_ATTR)).toBe(2);
    expect(resolveDropIndexFromPoint(400, 400, FORM_STUDIO_ROW_INDEX_ATTR)).toBeNull();
    document.elementFromPoint = original;
  });
});
