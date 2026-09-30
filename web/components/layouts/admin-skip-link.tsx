"use client";

export const MAIN_CONTENT_ID = "main-content";

export function AdminSkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-paper text-text-link ring-ring sr-only rounded-md px-3 py-2 text-sm font-medium shadow-md ring-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:outline-none motion-reduce:transition-none"
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
