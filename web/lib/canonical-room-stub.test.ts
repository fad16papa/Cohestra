/**
 * @vitest-environment jsdom
 */

import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ListTodo } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

import { CanonicalRoomStub } from "@/components/layouts/canonical-room-stub";

describe("canonical room stub presentations", () => {
  it("renders empty, loading, and error without a second h1", () => {
    const empty = renderToStaticMarkup(
      createElement(CanonicalRoomStub, {
        title: "Follow-up",
        icon: ListTodo,
        emptyTitle: "Follow-up queue comes next",
        emptyDescription: "Epic 40",
        primaryHref: "/dashboard",
        primaryLabel: "Back to Dashboard",
      })
    );
    const loading = renderToStaticMarkup(
      createElement(CanonicalRoomStub, {
        title: "Follow-up",
        state: "loading",
        icon: ListTodo,
        emptyTitle: "x",
        emptyDescription: "x",
        primaryHref: "/dashboard",
        primaryLabel: "Back",
      })
    );
    const error = renderToStaticMarkup(
      createElement(CanonicalRoomStub, {
        title: "Follow-up",
        state: "error",
        icon: ListTodo,
        emptyTitle: "x",
        emptyDescription: "x",
        primaryHref: "/dashboard",
        primaryLabel: "Back to Dashboard",
      })
    );

    expect(empty.match(/<h1/g)).toHaveLength(1);
    expect(empty).toContain("Follow-up queue comes next");
    expect(loading).toContain("Loading Follow-up");
    expect(loading.match(/<h1/g)).toHaveLength(1);
    expect(error).toContain('role="alert"');
    expect(error.match(/<h1/g)).toHaveLength(1);
  });
});
