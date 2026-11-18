"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  filterSearchableOptions,
  nextListboxIndex,
  type SearchableOption,
} from "@/lib/option-search";
import { cn } from "@/lib/utils";

type SearchableListboxProps<T extends SearchableOption> = {
  id: string;
  ariaLabel: string;
  value: string;
  options: readonly T[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder: string;
  triggerClassName?: string;
  trigger: (selected: T, open: boolean) => ReactNode;
  renderOption: (option: T, selected: boolean) => ReactNode;
  emptyLabel?: string;
  allowEmptyLabel?: string;
};

export function SearchableListbox<T extends SearchableOption>({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select",
  searchPlaceholder,
  triggerClassName,
  trigger,
  renderOption,
  emptyLabel = "No matches",
  allowEmptyLabel,
}: SearchableListboxProps<T>) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(
    () => filterSearchableOptions(options, query),
    [options, query]
  );
  const activeIndexSafe =
    filtered.length === 0
      ? -1
      : Math.min(Math.max(activeIndex, 0), filtered.length - 1);

  useEffect(() => {
    if (!open || activeIndexSafe < 0) {
      return;
    }

    const list = listRef.current;
    const option = document.getElementById(`${listId}-option-${activeIndexSafe}`);
    if (!list || !option) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.bottom > listRect.bottom) {
      list.scrollTop += optionRect.bottom - listRect.bottom;
    } else if (optionRect.top < listRect.top) {
      list.scrollTop -= listRect.top - optionRect.top;
    }
  }, [activeIndexSafe, listId, open, filtered]);

  function selectValue(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const listKey =
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End"
        ? event.key
        : null;
    if (listKey) {
      event.preventDefault();
      setActiveIndex((current) => nextListboxIndex(current, filtered.length, listKey));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndexSafe];
      if (option) {
        selectValue(option.value);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) {
          return;
        }

        setOpen(nextOpen);
        if (nextOpen) {
          setQuery("");
          const selectedIndex = options.findIndex((option) => option.value === value);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            className={cn(
              "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              triggerClassName
            )}
          />
        }
      >
        <span className="min-w-0 truncate">
          {selected ? trigger(selected, open) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] gap-2 p-2"
      >
        <input
          type="text"
          value={query}
          autoFocus
          aria-label={searchPlaceholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            activeIndexSafe >= 0 ? `${listId}-option-${activeIndexSafe}` : undefined
          }
          placeholder={searchPlaceholder}
          className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onSearchKeyDown}
        />
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain"
        >
          {allowEmptyLabel ? (
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-2.5 py-2 text-left text-sm text-text-muted-warm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectValue("")}
            >
              {allowEmptyLabel}
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-text-muted-warm" role="status">
              {emptyLabel}
            </p>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndexSafe;
              return (
                <button
                  key={option.value}
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex min-h-11 w-full min-w-0 items-center rounded-md px-2.5 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectValue(option.value)}
                >
                  {renderOption(option, isSelected)}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
