import { describe, expect, it } from "vitest";

import type { FormFieldDefinition } from "@/lib/activities-api";
import { collectHiddenAnswers } from "@/lib/hidden-field-query";

function hiddenField(
  id: string,
  defaultValue: string | null = null
): FormFieldDefinition {
  return {
    id,
    type: "hidden",
    label: "Campaign ref",
    required: false,
    placeholder: null,
    options: null,
    consentText: null,
    defaultValue,
  };
}

describe("collectHiddenAnswers", () => {
  it("matches query keys to Field id only", () => {
    const params = new URLSearchParams("ref=wa&utm_source=ig&tab=form");

    expect(
      collectHiddenAnswers([hiddenField("ref")], params)
    ).toEqual({ ref: "wa" });
  });

  it("ignores unknown query keys", () => {
    const params = new URLSearchParams("campaign=ig&other=1");

    expect(collectHiddenAnswers([hiddenField("ref")], params)).toEqual({});
  });

  it("uses defaultValue when the query key is missing or blank", () => {
    expect(
      collectHiddenAnswers([hiddenField("ref", "ig")], new URLSearchParams())
    ).toEqual({ ref: "ig" });

    expect(
      collectHiddenAnswers(
        [hiddenField("ref", "ig")],
        new URLSearchParams("ref=")
      )
    ).toEqual({ ref: "ig" });
  });

  it("lets a non-empty query value win over defaultValue", () => {
    expect(
      collectHiddenAnswers(
        [hiddenField("ref", "ig")],
        new URLSearchParams("ref=wa")
      )
    ).toEqual({ ref: "wa" });
  });
});
