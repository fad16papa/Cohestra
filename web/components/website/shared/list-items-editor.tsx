import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_LIST_ITEMS } from "@/lib/site-sections/limits";
import { clampListItems } from "@/lib/site-sections/registry";

import { BuilderItemsScrollArea } from "./builder-items-scroll-area";

function listItemKey(item: Record<string, unknown>, index: number): string {
  const key = item._key;
  return typeof key === "string" && key.length > 0 ? key : `item-${index}`;
}

type ListItemsEditorProps<T extends Record<string, unknown>> = {
  items: T[];
  disabled?: boolean;
  itemLabel: (index: number) => string;
  createItem: () => T;
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    patch: (patch: Partial<T>) => void
  ) => React.ReactNode;
};

export function ListItemsEditor<T extends Record<string, unknown>>({
  items,
  disabled = false,
  itemLabel,
  createItem,
  onChange,
  renderItem,
}: ListItemsEditorProps<T>) {
  function updateItems(next: T[]) {
    onChange(clampListItems(next));
  }

  return (
    <div className="space-y-3">
      <BuilderItemsScrollArea>
        {items.map((item, index) => (
          <div
            key={listItemKey(item as Record<string, unknown>, index)}
            className="space-y-3 rounded-lg border border-border-warm bg-card p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-warm">{itemLabel(index)}</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === 0}
                  aria-label={`Move ${itemLabel(index)} up`}
                  onClick={() => {
                    const next = [...items];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    updateItems(next);
                  }}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Move ${itemLabel(index)} down`}
                  onClick={() => {
                    const next = [...items];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    updateItems(next);
                  }}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || items.length <= 1}
                  aria-label={`Remove ${itemLabel(index)}`}
                  onClick={() => updateItems(items.filter((_, entryIndex) => entryIndex !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {renderItem(item, index, (patch) => {
              updateItems(
                items.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, ...patch } : entry
                )
              );
            })}
          </div>
        ))}
      </BuilderItemsScrollArea>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted-warm">
          {items.length} of {MAX_LIST_ITEMS} items
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || items.length >= MAX_LIST_ITEMS}
          onClick={() => updateItems([...items, createItem()])}
        >
          <Plus className="size-4" aria-hidden />
          Add item
        </Button>
      </div>
    </div>
  );
}
