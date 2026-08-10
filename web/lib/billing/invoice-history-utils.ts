import type { BillingInvoice } from "@/lib/billing/billing-details-api";

export const DEFAULT_INVOICE_DISPLAY_LIMIT = 10;

export type InvoiceDateFilter = {
  from: string;
  to: string;
};

function invoiceDayStart(isoDate: string): number {
  const date = new Date(isoDate);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function filterDayStart(dateInput: string): number {
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function filterDayEnd(dateInput: string): number {
  const [year, month, day] = dateInput.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function sortInvoicesLatestFirst(invoices: BillingInvoice[]): BillingInvoice[] {
  return [...invoices].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function filterInvoicesByDateRange(
  invoices: BillingInvoice[],
  filter: InvoiceDateFilter
): BillingInvoice[] {
  const from = filter.from.trim();
  const to = filter.to.trim();

  if (!from && !to) {
    return invoices;
  }

  return invoices.filter((invoice) => {
    const createdAt = invoiceDayStart(invoice.createdAt);

    if (from && createdAt < filterDayStart(from)) {
      return false;
    }

    if (to && createdAt > filterDayEnd(to)) {
      return false;
    }

    return true;
  });
}

export function prepareInvoiceHistory(
  invoices: BillingInvoice[],
  filter: InvoiceDateFilter,
  limit = DEFAULT_INVOICE_DISPLAY_LIMIT,
  showAll = false
): {
  sorted: BillingInvoice[];
  filtered: BillingInvoice[];
  visible: BillingInvoice[];
  hasMore: boolean;
} {
  const sorted = sortInvoicesLatestFirst(invoices);
  const filtered = filterInvoicesByDateRange(sorted, filter);
  const visible = showAll ? filtered : filtered.slice(0, limit);

  return {
    sorted,
    filtered,
    visible,
    hasMore: filtered.length > limit && !showAll,
  };
}
