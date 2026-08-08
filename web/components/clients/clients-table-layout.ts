/** Minimum width before the table scrolls horizontally on narrow viewports */
export const clientsTableScrollClassName = "overflow-x-auto";

export const clientsTableMinWidthClassName = "min-w-[42rem]";

/**
 * Desktop grid: checkbox · contact · status · last reg · last outreach · actions
 * Middle columns use balanced fr units; status/actions are fixed to content width.
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

export const clientsTableHeaderClassName =
  "text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm";

export const clientsTableHeaderButtonClassName =
  "w-full min-w-0 truncate p-0 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm transition-colors hover:text-text-warm";

/** @deprecated Use clientsTableContactColumnClassName */
export const clientsTableTextColumnClassName = clientsTableContactColumnClassName;
