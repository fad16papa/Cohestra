import { describe, expect, it } from "vitest";

import type { BillingInvoice } from "@/lib/billing/billing-details-api";

import {
  DEFAULT_INVOICE_DISPLAY_LIMIT,
  filterInvoicesByDateRange,
  prepareInvoiceHistory,
  sortInvoicesLatestFirst,
} from "@/lib/billing/invoice-history-utils";

function invoice(id: string, createdAt: string): BillingInvoice {
  return {
    id,
    createdAt,
    amountDueCents: 1000,
    currency: "usd",
    status: "paid",
    pdfUrl: null,
    hostedInvoiceUrl: null,
  };
}

describe("invoice-history-utils", () => {
  it("sorts invoices with the latest on top", () => {
    const sorted = sortInvoicesLatestFirst([
      invoice("a", "2026-01-01T00:00:00.000Z"),
      invoice("b", "2026-03-01T00:00:00.000Z"),
      invoice("c", "2026-02-01T00:00:00.000Z"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("filters invoices by inclusive date range", () => {
    const filtered = filterInvoicesByDateRange(
      [
        invoice("a", "2026-01-15T08:00:00.000Z"),
        invoice("b", "2026-02-10T08:00:00.000Z"),
        invoice("c", "2026-03-05T08:00:00.000Z"),
      ],
      { from: "2026-02-01", to: "2026-02-28" }
    );

    expect(filtered.map((item) => item.id)).toEqual(["b"]);
  });

  it("limits visible invoices to ten by default", () => {
    const invoices = Array.from({ length: 15 }, (_, index) =>
      invoice(`inv-${index}`, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`)
    );

    const result = prepareInvoiceHistory(invoices, { from: "", to: "" });

    expect(result.visible).toHaveLength(DEFAULT_INVOICE_DISPLAY_LIMIT);
    expect(result.hasMore).toBe(true);
  });

  it("shows all filtered invoices when requested", () => {
    const invoices = Array.from({ length: 12 }, (_, index) =>
      invoice(`inv-${index}`, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`)
    );

    const result = prepareInvoiceHistory(invoices, { from: "", to: "" }, 10, true);

    expect(result.visible).toHaveLength(12);
    expect(result.hasMore).toBe(false);
  });
});
