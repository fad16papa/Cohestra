"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { FormCompositionInspector } from "@/components/activities/form-composition-inspector";
import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { FormFieldPaletteDialog } from "@/components/activities/form-field-palette-dialog";
import { Button } from "@/components/ui/button";
import type { ActivityFormSchema, FormCompositionNode, FormFieldType } from "@/lib/activities-api";
import { findCompositionNode } from "@/lib/form-composition-tree";
import {
  addContentBlock,
  addInputFieldBlock,
  addSectionBlock,
  findFieldIndexByBlockId,
  getBuilderCanvasRows,
  removeCompositionBlock,
  reorderCompositionBlocks,
  type ContentBlockType,
} from "@/lib/form-composition-mutations";
import {
  filterFormFieldPaletteItems,
  getFormFieldPaletteGroups,
} from "@/lib/form-field-palette";
import { getDuplicateFieldIds } from "@/lib/form-schema-utils";
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

function blockTypeLabel(node: FormCompositionNode): string {
  if (node.kind === "fieldRef") {
    return "Input field";
  }

  if (node.kind === "section") {
    return "Section";
  }

  if (node.kind === "content") {
    if (node.contentType === "heading") {
      return "Heading";
    }
    if (node.contentType === "paragraph") {
      return "Paragraph";
    }
    if (node.contentType === "divider") {
      return "Divider";
    }
  }

  return node.kind;
}

function blockTitle(
  node: FormCompositionNode,
  schema: ActivityFormSchema
): string {
  if (node.kind === "fieldRef" && node.fieldId) {
    const field = schema.fields.find((entry) => entry.id === node.fieldId);
    return field?.label ?? node.fieldId;
  }

  if (node.kind === "content") {
    if (node.contentType === "divider") {
      return "Divider";
    }

    return node.content?.text?.trim() || blockTypeLabel(node);
  }

  if (node.kind === "section") {
    return node.title?.trim() || "Section";
  }

  return node.id;
}

function adjacentCanvasRowIndex(
  rows: ReturnType<typeof getBuilderCanvasRows>,
  flatIndex: number,
  direction: -1 | 1
): number | null {
  const row = rows[flatIndex];
  if (!row) {
    return null;
  }

  const pathKey = row.containerPath.join(".");
  for (
    let index = flatIndex + direction;
    index >= 0 && index < rows.length;
    index += direction
  ) {
    if (rows[index]!.containerPath.join(".") === pathKey) {
      return index;
    }
  }

  return null;
}

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
  const dragFromIndexRef = useRef<number | null>(null);

  function resolveDragFromIndex(event: React.DragEvent): number | null {
    if (dragFromIndexRef.current !== null) {
      return dragFromIndexRef.current;
    }

    const parsed = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const canvasRows = useMemo(() => getBuilderCanvasRows(schema), [schema]);
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
  const selectedNode = findCompositionNode(schema, selectedBlockId);

  const applySchema = useCallback(
    (next: ActivityFormSchema) => {
      onChange(next);
    },
    [onChange]
  );

  function selectNewBlock(next: ActivityFormSchema) {
    const rows = getBuilderCanvasRows(next);
    const last = rows[rows.length - 1];
    if (last?.node.id) {
      setSelectedBlockId(last.node.id);
    }
  }

  function addFieldType(type: FormFieldType) {
    const next = addInputFieldBlock(schema, type, {
      stepsEnabled,
      selectedBlockId,
    });
    applySchema(next);
    selectNewBlock(next);
  }

  function addContent(contentType: ContentBlockType) {
    const next = addContentBlock(schema, contentType, { selectedBlockId });
    applySchema(next);
    selectNewBlock(next);
  }

  function addSection() {
    const next = addSectionBlock(schema, { selectedBlockId });
    applySchema(next);
    selectNewBlock(next);
  }

  function moveBlock(flatIndex: number, direction: -1 | 1) {
    const target = adjacentCanvasRowIndex(canvasRows, flatIndex, direction);
    if (target === null) {
      return;
    }

    applySchema(reorderCompositionBlocks(schema, flatIndex, target));
  }

  function reorderTo(fromIndex: number, toIndex: number) {
    applySchema(reorderCompositionBlocks(schema, fromIndex, toIndex));
  }

  function removeBlock(blockId: string) {
    applySchema(removeCompositionBlock(schema, blockId));
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
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
                Input
              </p>
              <div className="mt-1 space-y-1">
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
            </div>
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
                Content
              </p>
              <div className="mt-1 space-y-1">
                {(
                  [
                    ["heading", "Heading"],
                    ["paragraph", "Paragraph"],
                    ["divider", "Divider"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() => addContent(type)}
                    className="flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
                Structure
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={addSection}
                className="mt-1 flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Section
              </button>
            </div>
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
            {canvasRows.length === 0 ? (
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
              <ul
                className="space-y-2"
                role="listbox"
                aria-label="Form blocks"
                onDragOver={(event) => {
                  if (disabled || dragFromIndexRef.current === null) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
              >
                {canvasRows.map((row, index) => {
                  const { node } = row;
                  const isSelected = selectedBlockId === node.id;
                  const isDragging = dragIndex === index;
                  const isDropTarget = dropIndex === index && dragIndex !== index;
                  const canMoveUp = adjacentCanvasRowIndex(canvasRows, index, -1) !== null;
                  const canMoveDown = adjacentCanvasRowIndex(canvasRows, index, 1) !== null;
                  return (
                    <li
                      key={node.id}
                      style={{ marginLeft: `${row.containerPath.length * 12}px` }}
                      onDragEnter={(event) => {
                        if (disabled || dragFromIndexRef.current === null) {
                          return;
                        }
                        event.preventDefault();
                        setDropIndex(index);
                      }}
                      onDragOver={(event) => {
                        if (disabled || dragFromIndexRef.current === null) {
                          return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropIndex(index);
                      }}
                      onDrop={(event) => {
                        if (disabled) {
                          return;
                        }
                        event.preventDefault();
                        const fromIndex = resolveDragFromIndex(event);
                        if (fromIndex === null || fromIndex === index) {
                          dragFromIndexRef.current = null;
                          setDragIndex(null);
                          setDropIndex(null);
                          return;
                        }
                        reorderTo(fromIndex, index);
                        dragFromIndexRef.current = null;
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                    >
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
                            aria-label={`Drag to reorder ${blockTitle(node, schema)}`}
                            aria-grabbed={isDragging}
                            onDragStart={(event) => {
                              if (disabled) {
                                return;
                              }
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(index));
                              dragFromIndexRef.current = index;
                              setDragIndex(index);
                              setDropIndex(index);
                            }}
                            onDragEnd={() => {
                              dragFromIndexRef.current = null;
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
                              disabled={disabled || !canMoveUp}
                              aria-label={`Move ${blockTitle(node, schema)} up`}
                              onClick={() => moveBlock(index, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              disabled={disabled || !canMoveDown}
                              aria-label={`Move ${blockTitle(node, schema)} down`}
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
                            className="min-w-0 flex-1 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <p className="truncate text-sm font-medium text-text-warm">
                              {index + 1}. {blockTitle(node, schema)}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-text-muted-warm">
                              {blockTypeLabel(node)}
                              {node.kind === "fieldRef" &&
                              schema.fields.find((f) => f.id === node.fieldId)?.required
                                ? " · Required"
                                : ""}
                            </p>
                          </button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={disabled}
                            aria-label={`Remove ${blockTitle(node, schema)}`}
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

        <section className={cn(panelShell, "min-h-[20rem] lg:min-h-[28rem]")}>
          <div className="border-b border-border-warm px-4 py-3">
            <h4 className="text-sm font-semibold text-text-warm">Block properties</h4>
            <p className="mt-1 text-xs text-text-muted-warm">
              {selectedNode
                ? `${blockTypeLabel(selectedNode)} · ${blockTitle(selectedNode, schema)}`
                : "Select a block in the form structure to edit it."}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!selectedNode ? (
              <p className="text-sm text-text-muted-warm">
                Select a block to configure its settings.
              </p>
            ) : selectedNode.kind === "fieldRef" && selectedFieldIndex !== null ? (
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
                onCompositionBlockIdRenamed={(_previous, nextBlockId) => {
                  setSelectedBlockId(nextBlockId);
                }}
              />
            ) : (
              <FormCompositionInspector
                schema={schema}
                node={selectedNode}
                onChange={onChange}
                disabled={disabled}
              />
            )}
          </div>
        </section>
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
