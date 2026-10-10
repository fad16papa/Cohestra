"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  docsImageAspectRatio,
  isAllowedDocsImageSrc,
  type DocsImageBlock,
} from "@/lib/marketing/product-docs-images";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ProductDocsImage({ block }: { block: DocsImageBlock }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const root = dialogRef.current;
      if (!root) {
        return;
      }
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => !node.hasAttribute("disabled")
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) {
        previous.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  if (!isAllowedDocsImageSrc(block.src)) {
    return null;
  }

  return (
    <figure className="overflow-hidden rounded-[16px] border border-line bg-paper">
      <button
        ref={triggerRef}
        type="button"
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge screenshot: ${block.caption}`}
      >
        <span
          className="relative block w-full overflow-hidden bg-paper-warm"
          style={{ aspectRatio: docsImageAspectRatio(block.width, block.height) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top"
          />
        </span>
      </button>
      <figcaption className="border-t border-line px-4 py-3 text-sm leading-relaxed text-text-muted">
        {block.caption}
      </figcaption>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[16px] bg-paper p-3 shadow-xl",
              "motion-reduce:transition-none"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p id={titleId} className="text-sm font-semibold text-ink">
                {block.caption}
              </p>
              <button
                ref={closeRef}
                type="button"
                className="rounded-[8px] border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.src}
              alt={block.alt}
              width={block.width}
              height={block.height}
              className="h-auto w-full rounded-[12px]"
            />
          </div>
        </div>
      ) : null}
    </figure>
  );
}
