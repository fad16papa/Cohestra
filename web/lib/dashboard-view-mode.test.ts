import { afterEach, describe, expect, it } from "vitest";

import {
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  dashboardHrefForView,
  parseDashboardViewParam,
  readDashboardViewMode,
  resolveDashboardView,
  serializeDashboardViewParam,
  writeDashboardViewMode,
} from "@/lib/dashboard-view-mode";

describe("dashboard view query", () => {
  it("parses valid, absent, and invalid values", () => {
    expect(parseDashboardViewParam(null)).toBe("absent");
    expect(parseDashboardViewParam("")).toBe("absent");
    expect(parseDashboardViewParam("overview")).toBe("overview");
    expect(parseDashboardViewParam("graphs")).toBe("graphs");
    expect(parseDashboardViewParam("table")).toBe("table");
    expect(parseDashboardViewParam("tables")).toBe("invalid");
    expect(parseDashboardViewParam("kanban")).toBe("invalid");
  });

  it("lets a valid query override stored preference", () => {
    expect(resolveDashboardView("table", "graphs")).toBe("table");
    expect(resolveDashboardView("graphs", "overview")).toBe("graphs");
    expect(resolveDashboardView("overview", "table")).toBe("overview");
  });

  it("uses preference only when the query is absent", () => {
    expect(resolveDashboardView(null, "graphs")).toBe("graphs");
    expect(resolveDashboardView("", "table")).toBe("table");
  });

  it("resolves invalid query to overview even when preference exists", () => {
    expect(resolveDashboardView("nope", "graphs")).toBe("overview");
    expect(resolveDashboardView("tables", "table")).toBe("overview");
  });

  it("defaults overview and omits it from the serialized query", () => {
    expect(resolveDashboardView(null, "overview")).toBe("overview");
    expect(serializeDashboardViewParam("overview")).toBeNull();
    expect(serializeDashboardViewParam("graphs")).toBe("graphs");
    expect(serializeDashboardViewParam("table")).toBe("table");
    expect(dashboardHrefForView("overview")).toBe("/dashboard");
    expect(dashboardHrefForView("graphs")).toBe("/dashboard?view=graphs");
    expect(dashboardHrefForView("table", "utm=1")).toBe("/dashboard?utm=1&view=table");
    expect(dashboardHrefForView("overview", "view=graphs&utm=1")).toBe("/dashboard?utm=1");
  });
});

describe("dashboard view preference storage", () => {
  afterEach(() => {
    window.localStorage.removeItem(DASHBOARD_VIEW_MODE_STORAGE_KEY);
  });

  it("migrates legacy stored tables to table", () => {
    window.localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, "tables");
    expect(readDashboardViewMode()).toBe("table");
  });

  it("writes and reads a valid preference", () => {
    writeDashboardViewMode("graphs");
    expect(readDashboardViewMode()).toBe("graphs");
  });
});
