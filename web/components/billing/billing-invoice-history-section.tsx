"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatInvoiceAmount,
  type BillingInvoice,
} from "@/lib/billing/billing-details-api";
import {
  DEFAULT_INVOICE_DISPLAY_LIMIT,
  prepareInvoiceHistory,
} from "@/lib/billing/invoice-history-utils";
import { cn } from "@/lib/utils";

type BillingInvoiceHistorySectionProps = {
  invoices: BillingInvoice[];
};

export function BillingInvoiceHistorySection({
  invoices,
}: BillingInvoiceHistorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { filtered, visible, hasMore } = useMemo(
    () =>
      prepareInvoiceHistory(
        invoices,
        { from: dateFrom, to: dateTo },
        DEFAULT_INVOICE_DISPLAY_LIMIT,
        showAll
      ),
    [dateFrom, dateTo, invoices, showAll]
  );

  const invoiceLabel =
    invoices.length === 1 ? "1 invoice" : `${invoices.length} invoices`;

  return (
    <section className="rounded-2xl border border-border-warm bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Invoice history
          </h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            {invoices.length === 0
              ? "Paid invoices and receipts appear here."
              : `${invoiceLabel} · latest first`}
          </p>
        </div>
        {invoices.length > 0 ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Collapse
                <ChevronUp className="size-4" aria-hidden />
              </>
            ) : (
              <>
                Expand
                <ChevronDown className="size-4" aria-hidden />
              </>
            )}
          </button>
        ) : null}
      </div>

      {invoices.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted-warm">No invoice history yet.</p>
      ) : expanded ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-history-from">From</Label>
              <Input
                id="invoice-history-from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setShowAll(false);
                  setDateFrom(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-history-to">To</Label>
              <Input
                id="invoice-history-to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setShowAll(false);
                  setDateTo(event.target.value);
                }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted-warm">
              No invoices match this date range.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border-warm">
                {visible.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-text-warm">
                        {formatInvoiceAmount(invoice.amountDueCents, invoice.currency)}
                      </p>
                      <p className="text-text-muted-warm">
                        {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}
                        {invoice.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "gap-2"
                          )}
                        >
                          <Download className="size-4" aria-hidden />
                          PDF
                        </a>
                      ) : null}
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {hasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
                  Show all {filtered.length} invoices
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted-warm">
          Showing the latest {Math.min(DEFAULT_INVOICE_DISPLAY_LIMIT, invoices.length)}{" "}
          invoices when expanded.
        </p>
      )}
    </section>
  );
}
