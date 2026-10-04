/** Community / legacy CSS grid. The Clients room uses the semantic table instead. */
export const clientsTableScrollClassName = "overflow-x-auto";

/** Clients list must not force a 42rem desktop min-width trap. */
export const clientsTableMinWidthClassName = "min-w-0";

/**
 * Desktop grid: checkbox · contact · status · last reg · last outreach · actions
 * Used by community lead lists. Clients `/clients` no longer uses this grid.
 */
export const clientsTableGridClassName = [
  "grid grid-cols-1 gap-y-3 px-4 py-3.5",
  "sm:grid-cols-[2rem_minmax(11rem,1.35fr)_5.5rem_minmax(0,1fr)_minmax(0,1fr)_6.75rem]",
  "sm:items-center sm:gap-x-4 sm:gap-y-0 sm:px-4 sm:py-3",
].join(" ");

export const clientsTableCheckboxColumnClassName =
  "hidden sm:flex sm:items-center sm:justify-center";

export const clientsTableContactColumnClassName = "min-w-0";

export const clientsTableStatusColumnClassName =
  "flex min-w-0 items-center sm:max-w-[5.5rem]";

export const clientsTableRegistrationColumnClassName = "min-w-0";

export const clientsTableOutreachColumnClassName = "min-w-0";

export const clientsTableActionsColumnClassName =
  "flex min-w-0 items-center gap-1 sm:max-w-[6.75rem] sm:justify-end";

export const clientsTableClassName =
  "hidden w-full min-w-0 table-fixed border-separate border-spacing-0 text-left md:table";

export const clientsSemanticTableCheckboxClassName =
  "flex items-center justify-center";

export const clientsSemanticTableActionsClassName =
  "flex min-w-0 flex-wrap items-center justify-end gap-1";

export const clientsTableHeaderClassName =
  "text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm";

export const clientsTableHeaderButtonClassName =
  "inline-flex min-h-11 min-w-11 items-center p-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm motion-press hover:text-text-warm";

export const clientsTableCellClassName =
  "border-b border-border-warm px-3 py-1.5 align-middle";

export const clientsTableHeaderCellClassName =
  "border-b border-border-warm bg-muted/30 px-3 py-1 text-xs font-medium uppercase tracking-wide text-text-muted-warm";

/** @deprecated Use clientsTableContactColumnClassName */
export const clientsTableTextColumnClassName = clientsTableContactColumnClassName;
