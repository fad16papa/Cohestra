"use client";

import { Lock } from "lucide-react";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterFormFieldPaletteItems,
  getFormFieldPaletteGroups,
  type FormFieldPaletteGroup,
  type FormFieldPaletteItem,
} from "@/lib/form-field-palette";
import type { FormFieldType } from "@/lib/activities-api";
import { cn } from "@/lib/utils";

type FormFieldPaletteDialogProps = {
  open: boolean;
  disabled?: boolean;
  corePlusLocked?: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: FormFieldType) => void;
};

export function FormFieldPaletteDialog({
  open,
  disabled = false,
  corePlusLocked = false,
  onOpenChange,
  onSelect,
}: FormFieldPaletteDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const paletteGroups = useMemo(
    () => getFormFieldPaletteGroups(corePlusLocked),
    [corePlusLocked]
  );

  const filteredItems = useMemo(
    () => filterFormFieldPaletteItems(query, paletteGroups),
    [paletteGroups, query]
  );

  const selectableItems = useMemo(
    () => filteredItems.filter((item) => !item.locked),
    [filteredItems]
  );

  useEffect(() => {
    if (disabled && open) {
      onOpenChange(false);
    }
  }, [disabled, onOpenChange, open]);

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

      if (disabled || selectableItems.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => {
          const next = findNextSelectableIndex(filteredItems, current, 1);
          return next ?? current;
        });
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          const next = findNextSelectableIndex(filteredItems, current, -1);
          return next ?? current;
        });
      }

      if (event.key === "Enter") {
        if (event.isComposing) {
          return;
        }

        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (item && !item.locked) {
          onSelect(item.type);
          onOpenChange(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeIndex,
    disabled,
    filteredItems,
    onOpenChange,
    onSelect,
    open,
    selectableItems.length,
  ]);

  if (!open || disabled) {
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
                const groupLabel = findGroupLabel(item, paletteGroups);
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
                      aria-disabled={item.locked}
                      disabled={disabled || item.locked}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => {
                        if (disabled || item.locked) {
                          return;
                        }

                        onSelect(item.type);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        item.locked
                          ? "cursor-not-allowed text-text-muted-warm"
                          : isActive
                            ? "bg-primary/10 text-text-warm"
                            : "text-text-warm hover:bg-muted/60"
                      )}
                    >
                      <span>{item.label}</span>
                      {item.locked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted-warm">
                          <Lock className="size-3.5" aria-hidden />
                          Core+
                        </span>
                      ) : null}
                    </button>
                    {item.locked && item.lockedReason && isActive ? (
                      <p className="px-3 pb-1 text-xs text-text-muted-warm">
                        {item.lockedReason}
                      </p>
                    ) : null}
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

function findGroupLabel(
  item: FormFieldPaletteItem,
  groups: FormFieldPaletteGroup[]
): string {
  for (const group of groups) {
    if (group.items.some((candidate) => candidate.type === item.type)) {
      return group.label;
    }
  }

  return "Fields";
}

function findNextSelectableIndex(
  items: FormFieldPaletteItem[],
  currentIndex: number,
  direction: 1 | -1
): number | null {
  if (items.length === 0) {
    return null;
  }

  let index = currentIndex;
  for (let step = 0; step < items.length; step += 1) {
    index = (index + direction + items.length) % items.length;
    if (!items[index]?.locked) {
      return index;
    }
  }

  return null;
}
