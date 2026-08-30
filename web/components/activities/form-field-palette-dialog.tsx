"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterFormFieldPaletteItems,
  formFieldPaletteGroups,
  type FormFieldPaletteItem,
} from "@/lib/form-field-palette";
import type { FormFieldType } from "@/lib/activities-api";
import { cn } from "@/lib/utils";

type FormFieldPaletteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: FormFieldType) => void;
};

export function FormFieldPaletteDialog({
  open,
  onOpenChange,
  onSelect,
}: FormFieldPaletteDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredItems = useMemo(
    () => filterFormFieldPaletteItems(query),
    [query]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex((current) =>
      filteredItems.length === 0 ? 0 : Math.min(current, filteredItems.length - 1)
    );
  }, [filteredItems.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (filteredItems.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filteredItems.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (current) => (current - 1 + filteredItems.length) % filteredItems.length
        );
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (item) {
          onSelect(item.type);
          onOpenChange(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredItems, onOpenChange, onSelect, open]);

  if (!open) {
    return null;
  }

  let lastGroupLabel = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[min(20vh,8rem)]">
      <button
        type="button"
        aria-label="Close field palette"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add form field"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border-warm bg-popover shadow-2xl ring-1 ring-primary/10"
      >
        <div className="flex items-center gap-3 border-b border-border-warm px-4 py-3">
          <Search className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search field types…"
            aria-label="Search field types"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-warm outline-none placeholder:text-text-muted-warm"
          />
          <kbd className="hidden rounded border border-border-warm bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted-warm sm:inline">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-muted-warm">
              No matching field types.
            </p>
          ) : (
            <ul role="listbox" aria-label="Field types">
              {filteredItems.map((item, index) => {
                const groupLabel = findGroupLabel(item);
                const showHeader = groupLabel !== lastGroupLabel;
                lastGroupLabel = groupLabel;
                const isActive = index === activeIndex;

                return (
                  <li key={item.type}>
                    {showHeader ? (
                      <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        {groupLabel}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        onSelect(item.type);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm outline-none",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary/10 text-text-warm"
                          : "text-text-warm hover:bg-muted/60"
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border-warm px-4 py-2 text-xs text-text-muted-warm">
          <span className="hidden sm:inline">
            Arrow keys to move · Enter to add · Esc to close
          </span>
          <span className="sm:hidden">Tap a field type to add it</span>
        </div>
      </div>
    </div>
  );
}

function findGroupLabel(item: FormFieldPaletteItem): string {
  for (const group of formFieldPaletteGroups) {
    if (group.items.some((candidate) => candidate.type === item.type)) {
      return group.label;
    }
  }

  return "Fields";
}
