"use client";

export const MAIN_CONTENT_ID = "main-content";

export function AdminSkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-paper text-text-link ring-ring fixed left-3 top-3 z-[80] -translate-y-[calc(100%+1.5rem)] rounded-md px-3.5 py-2.5 text-sm font-medium whitespace-nowrap shadow-lg ring-2 outline-none focus:translate-y-0 motion-reduce:transition-none"
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
