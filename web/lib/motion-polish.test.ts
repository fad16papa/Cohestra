import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ADMIN_ROUTE_ENTER_DURATION } from "@/lib/admin-route-motion";

const GLOBALS_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../app/globals.css"),
  "utf8"
);
const BUTTON_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/button.tsx"),
  "utf8"
);
const METRIC_TILE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/dashboard/metric-tile.tsx"),
  "utf8"
);
const CLIENT_PROFILE_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-profile-motion.tsx"),
  "utf8"
);
const DIALOG_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/ui/dialog.tsx"),
  "utf8"
);
const SKELETON_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/shared/list-skeleton.tsx"),
  "utf8"
);
const NAV_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/layouts/admin-nav-links.tsx"),
  "utf8"
);

describe("37.3 motion polish contracts", () => {
  it("keeps route enter inside the 180–300ms context budget", () => {
    expect(ADMIN_ROUTE_ENTER_DURATION).toBe("0.28s");
    expect(GLOBALS_SOURCE).toContain("page-enter 0.28s ease-out");
    expect(GLOBALS_SOURCE).not.toContain("page-enter 0.35s");
  });

  it("defines press and local tokens with reduced-motion disable", () => {
    expect(GLOBALS_SOURCE).toContain(".motion-press");
    expect(GLOBALS_SOURCE).toContain(".motion-local");
    expect(GLOBALS_SOURCE).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.motion-press/
    );
  });

  it("does not use transition-all on the shared button", () => {
    expect(BUTTON_SOURCE).toContain("motion-press");
    expect(BUTTON_SOURCE).not.toContain("transition-all");
  });

  it("does not stack cinematic fade-in-up under admin route enter", () => {
    expect(METRIC_TILE_SOURCE).not.toContain("animate-fade-in-up");
    expect(METRIC_TILE_SOURCE).toContain("motion-press");
    expect(CLIENT_PROFILE_SOURCE).not.toContain("animate-fade-in-up");
    expect(CLIENT_PROFILE_SOURCE).toContain("motion-press");
  });

  it("uses a faster overlay exit than enter", () => {
    expect(DIALOG_SOURCE).toContain("duration-200");
    expect(DIALOG_SOURCE).toContain("data-ending-style:duration-150");
  });

  it("gates list skeletons and nav chrome on motion-safe tokens", () => {
    expect(SKELETON_SOURCE).toContain("motion-safe:animate-pulse");
    expect(SKELETON_SOURCE).not.toMatch(/className="flex animate-pulse/);
    expect(NAV_SOURCE).toContain("motion-press");
    expect(NAV_SOURCE).not.toContain("transition-all");
  });
});
