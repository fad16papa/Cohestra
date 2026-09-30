"use client";

export const MAIN_CONTENT_ID = "main-content";

export function AdminSkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-paper text-text-link ring-ring sr-only rounded-md px-3.5 py-2.5 text-sm font-medium shadow-lg ring-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:outline-none motion-reduce:transition-none"
      onClick={(event) => {
        const target = document.getElementById(MAIN_CONTENT_ID);
        if (!target) {
          return;
        }

        event.preventDefault();
        target.focus({ preventScroll: false });
      }}
    >
      Skip to main content
    </a>
  );
}
