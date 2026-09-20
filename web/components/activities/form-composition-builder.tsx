"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { FormFieldPaletteDialog } from "@/components/activities/form-field-palette-dialog";
import { Button } from "@/components/ui/button";
import type { ActivityFormSchema, FormFieldType } from "@/lib/activities-api";
import {
  addInputFieldBlock,
  findFieldIndexByBlockId,
  getCanvasComposition,
  removeFieldRefBlock,
  reorderCompositionBlocks,
} from "@/lib/form-composition-mutations";
import {
  filterFormFieldPaletteItems,
  getFormFieldPaletteGroups,
} from "@/lib/form-field-palette";
import { formFieldTypeLabels, getDuplicateFieldIds } from "@/lib/form-schema-utils";
import { cn } from "@/lib/utils";

type FormCompositionBuilderProps = {
  schema: ActivityFormSchema;
  onChange: (schema: ActivityFormSchema) => void;
  disabled?: boolean;
  className?: string;
  recipesLocked?: boolean;
  corePlusLocked?: boolean;
  stepsEnabled?: boolean;
  stepsLocked?: boolean;
};

const panelShell =
  "flex min-h-[20rem] min-w-0 flex-col rounded-xl border border-border-warm bg-card lg:min-h-[28rem]";

export function FormCompositionBuilder({
  schema,
  onChange,
  disabled = false,
  className,
  recipesLocked = false,
  corePlusLocked = false,
  stepsEnabled = false,
  stepsLocked = false,
}: FormCompositionBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const canvasNodes = useMemo(() => getCanvasComposition(schema), [schema]);
  const paletteGroups = useMemo(
    () => getFormFieldPaletteGroups(corePlusLocked),
    [corePlusLocked]
  );
  const paletteItems = useMemo(
    () =>
      filterFormFieldPaletteItems("", paletteGroups).filter(
        (item) =>
          !item.locked &&
          item.type !== "section_header" &&
          item.type !== "info" &&
          item.type !== "hidden"
      ),
    [paletteGroups]
  );

  const duplicateFieldIds = useMemo(
    () => getDuplicateFieldIds(schema.fields),
    [schema.fields]
  );

  const selectedFieldIndex = findFieldIndexByBlockId(schema, selectedBlockId);

  const applySchema = useCallback(
    (next: ActivityFormSchema) => {
      onChange(next);
    },
    [onChange]
  );

  function addFieldType(type: FormFieldType) {
    const next = addInputFieldBlock(schema, type, { stepsEnabled });
    applySchema(next);
    const newBlock = next.composition?.[next.composition.length - 1];
    if (newBlock?.id) {
      setSelectedBlockId(newBlock.id);
    }
  }

  function moveBlock(index: number, direction: -1 | 1) {
    applySchema(reorderCompositionBlocks(schema, index, index + direction));
  }

  function reorderTo(fromIndex: number, toIndex: number) {
    applySchema(reorderCompositionBlocks(schema, fromIndex, toIndex));
  }

  function removeBlock(blockId: string) {
    applySchema(removeFieldRefBlock(schema, blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-section text-text-warm">Form builder</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Add blocks, arrange structure, and configure fields. Preview updates as
          you edit — save when ready.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]">
        <aside className={cn(panelShell, "p-3")}>
          <h4 className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Block palette
          </h4>
          <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {paletteItems.map((item) => (
              <button
                key={item.type}
                type="button"
                disabled={disabled}
                onClick={() => addFieldType(item.type)}
                className="flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled={disabled}
            onClick={() => setPaletteOpen(true)}
          >
            <Plus className="size-4" />
            Browse all fields
          </Button>
        </aside>

        <section className={panelShell} aria-label="Form structure">
          <div className="border-b border-border-warm px-4 py-3">
            <h4 className="text-sm font-semibold text-text-warm">Form structure</h4>
            <p className="mt-1 text-xs text-text-muted-warm">
              Top to bottom matches registration order. Drag or use arrow buttons to
              reorder.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {canvasNodes.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
                <p className="text-sm text-text-muted-warm">
                  Add your first field to start building this registration form.
                </p>
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => setPaletteOpen(true)}
                >
                  <Plus className="size-4" />
                  Add your first field
                </Button>
              </div>
            ) : (
              <ul className="space-y-2" role="listbox" aria-label="Form blocks">
                {canvasNodes.map((node, index) => {
                  const field = schema.fields.find((f) => f.id === node.fieldId);
                  const isSelected = selectedBlockId === node.id;
                  const isDragging = dragIndex === index;
                  const isDropTarget = dropIndex === index && dragIndex !== index;
                  return (
                    <li key={node.id}>
                      <div
                        className={cn(
                          "rounded-lg border border-transparent p-2 transition-colors",
                          isSelected && "border-border-warm bg-muted/40",
                          isDragging && "opacity-50",
                          isDropTarget && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            draggable={!disabled}
                            disabled={disabled}
                            aria-label={`Drag to reorder ${field?.label ?? node.id}`}
                            aria-grabbed={isDragging}
                            onDragStart={(event) => {
                              if (disabled) {
                                return;
                              }
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(index));
                              setDragIndex(index);
                              setDropIndex(index);
                            }}
                            onDragEnd={() => {
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                            className={cn(
                              "mt-0.5 shrink-0 rounded-md p-1 text-text-muted-warm outline-none touch-none hover:bg-muted/60 hover:text-text-warm focus-visible:ring-2 focus-visible:ring-ring",
                              disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing"
                            )}
                          >
                            <GripVertical className="size-4" aria-hidden />
                          </button>

                          <div className="flex shrink-0 flex-col gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              disabled={disabled || index === 0}
                              aria-label={`Move ${field?.label ?? "field"} up`}
                              onClick={() => moveBlock(index, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              disabled={disabled || index === canvasNodes.length - 1}
                              aria-label={`Move ${field?.label ?? "field"} down`}
                              onClick={() => moveBlock(index, 1)}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                          </div>

                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={disabled}
                            onClick={() => setSelectedBlockId(node.id)}
                            onDragOver={(event) => {
                              if (disabled || dragIndex === null) {
                                return;
                              }
                              event.preventDefault();
                              setDropIndex(index);
                            }}
                            onDrop={(event) => {
                              if (disabled || dragIndex === null) {
                                return;
                              }
                              event.preventDefault();
                              reorderTo(dragIndex, index);
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                            className="min-w-0 flex-1 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <p className="truncate text-sm font-medium text-text-warm">
                              {index + 1}. {field?.label ?? "Missing field"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-text-muted-warm">
                              {field ? formFieldTypeLabels[field.type] : "fieldRef"}
                              {field?.required ? " · Required" : ""}
                            </p>
                          </button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={disabled}
                            aria-label={`Remove ${field?.label ?? "field"}`}
                            onClick={() => removeBlock(node.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <FormFieldEditor
          schema={schema}
          onChange={onChange}
          disabled={disabled}
          recipesLocked={recipesLocked}
          corePlusLocked={corePlusLocked}
          stepsEnabled={stepsEnabled}
          stepsLocked={stepsLocked}
          inspectorOnly
          inspectorFieldIndex={selectedFieldIndex}
          className="min-h-[20rem] lg:min-h-[28rem]"
        />
      </div>

      <FormFieldPaletteDialog
        open={paletteOpen}
        disabled={disabled}
        corePlusLocked={corePlusLocked}
        onOpenChange={setPaletteOpen}
        onSelect={(type) => {
          if (
            type === "section_header" ||
            type === "info" ||
            type === "hidden"
          ) {
            return;
          }
          addFieldType(type);
          setPaletteOpen(false);
        }}
      />
    </div>
  );
}
