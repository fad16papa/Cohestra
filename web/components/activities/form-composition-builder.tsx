"use client";

import { ChevronDown, ChevronUp, Lock, Plus, Trash2 } from "lucide-react";
import { BuilderReorderHandle } from "@/components/builder/builder-reorder-handle";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { FormCompositionInspector } from "@/components/activities/form-composition-inspector";
import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { FormFieldPaletteDialog } from "@/components/activities/form-field-palette-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ActivityFormSchema, FormCompositionNode, FormFieldType } from "@/lib/activities-api";
import { findCompositionNode } from "@/lib/form-composition-tree";
import {
  addColumnsBlock,
  addContentBlock,
  addDomainBlock,
  addInputFieldBlock,
  addSectionBlock,
  findFieldIndexByBlockId,
  getBuilderCanvasRows,
  moveCompositionBlockToColumn,
  removeCompositionBlock,
  reorderCompositionBlocks,
  type ContentBlockType,
} from "@/lib/form-composition-mutations";
import {
  COLUMNS_LOCKED_REASON,
  filterFormFieldPaletteItems,
  getFormFieldPaletteGroups,
} from "@/lib/form-field-palette";
import {
  DOMAIN_LOCKED_REASON,
  FORM_COMPOSITION_DOMAIN_TYPES,
  FORM_DOMAIN_BLOCK_LABELS,
  type FormCompositionDomainType,
} from "@/lib/form-domain-blocks";
import {
  compositionHasPresentationBlocks,
  CONVERSATIONAL_PRESENTATION_NOTICE,
} from "@/lib/form-composition-presentation";
import { getDuplicateFieldIds } from "@/lib/form-schema-utils";
import {
  BUILDER_PRESENCE_ENTER_CLASS,
  BUILDER_SELECTION_CLASS,
} from "@/lib/builder-motion";
import {
  FORM_STUDIO_INSPECTOR_ID,
  FORM_STUDIO_INSPECTOR_TOGGLE_ID,
  FORM_STUDIO_STACKED_QUERY,
  FORM_STUDIO_THREE_PANE_QUERY,
  FORM_STUDIO_TWO_PANE_QUERY,
  getLiveFormStudioComposition,
  isInspectorToggleExpanded,
  resolveInspectorAfterResize,
  type FormStudioComposition,
} from "@/lib/form-studio-workspace";
import {
  FORM_STUDIO_ROW_INDEX_ATTR,
  resolveDropIndexFromPoint,
  shouldStartHandlePointerDrag,
} from "@/lib/builder-pointer-reorder";
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
  /** When true, show notice if presentation blocks will not appear on public conversational flow. */
  conversationalFlowActive?: boolean;
};

const panelShell =
  "flex min-h-[20rem] min-w-0 flex-col rounded-xl border border-border-warm bg-card lg:min-h-[28rem]";

function useLayoutSyncMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

function blockTypeLabel(node: FormCompositionNode): string {
  if (node.kind === "fieldRef") {
    return "Input field";
  }

  if (node.kind === "section") {
    return "Section";
  }

  if (node.kind === "columns") {
    return "Two-column row";
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

  if (node.kind === "domain") {
    return "Connected to this Activity";
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

  if (node.kind === "columns") {
    return "Two-column row";
  }

  if (node.kind === "domain") {
    return (
      FORM_DOMAIN_BLOCK_LABELS[node.domain as FormCompositionDomainType] ??
      "Activity block"
    );
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
    const candidate = rows[index]!;
    if (candidate.containerPath.join(".") === pathKey) {
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
  conversationalFlowActive = false,
}: FormCompositionBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [reorderStatus, setReorderStatus] = useState("");
  const dragFromIndexRef = useRef<number | null>(null);
  const pointerFromIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const pointerHandlersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const dockedInspectorRef = useRef<HTMLElement>(null);
  const previousCompositionRef = useRef<FormStudioComposition | null>(null);
  const inspectorOpenRef = useRef(inspectorOpen);
  const sheetOpenRef = useRef(sheetOpen);
  const isStacked = useLayoutSyncMedia(FORM_STUDIO_STACKED_QUERY);
  const isTwoPane = useLayoutSyncMedia(FORM_STUDIO_TWO_PANE_QUERY);
  const isThreePane = useLayoutSyncMedia(FORM_STUDIO_THREE_PANE_QUERY);
  const composition: FormStudioComposition | null = isStacked
    ? "stacked"
    : isTwoPane
      ? "two-pane"
      : isThreePane
        ? "three-pane"
        : null;

  useEffect(() => {
    inspectorOpenRef.current = inspectorOpen;
    sheetOpenRef.current = sheetOpen;
  }, [inspectorOpen, sheetOpen]);

  function resolveDragFromIndex(event: React.DragEvent): number | null {
    if (dragFromIndexRef.current !== null) {
      return dragFromIndexRef.current;
    }

    const parsed = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function clearDragChrome() {
    dragFromIndexRef.current = null;
    pointerFromIndexRef.current = null;
    dropIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  function detachPointerListeners() {
    const handlers = pointerHandlersRef.current;
    if (!handlers) {
      return;
    }

    document.removeEventListener("pointermove", handlers.move);
    document.removeEventListener("pointerup", handlers.up);
    document.removeEventListener("pointercancel", handlers.up);
    pointerHandlersRef.current = null;
  }

  function focusReorderHandle(blockId: string | null) {
    if (!blockId) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(`form-studio-reorder-${blockId}`)?.focus();
    });
  }

  function announceReorder(name: string, nextIndex: number, total: number) {
    setReorderStatus(`Moved ${name} to position ${nextIndex + 1} of ${total}`);
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
  const selectedRow = canvasRows.find((row) => row.node.id === selectedBlockId);
  const selectedContext = selectedNode
    ? `${blockTypeLabel(selectedNode)} · ${blockTitle(selectedNode, schema)}`
    : "Select a block in the form structure to edit it.";
  const inspectorExpanded = isInspectorToggleExpanded(
    composition ?? "stacked",
    inspectorOpen,
    sheetOpen
  );

  useLayoutEffect(() => {
    if (!composition) {
      return;
    }

    const previous = previousCompositionRef.current;
    previousCompositionRef.current = composition;
    if (previous == null || previous === composition) {
      return;
    }

    const next = resolveInspectorAfterResize({
      previous,
      next: composition,
      inspectorOpen: inspectorOpenRef.current,
      sheetOpen: sheetOpenRef.current,
    });
    setInspectorOpen(next.inspectorOpen);
    setSheetOpen(next.sheetOpen);

    const inspectorHeldFocus = Boolean(
      dockedInspectorRef.current?.contains(document.activeElement)
    );
    if (previous === "stacked" && sheetOpenRef.current) {
      inspectorToggleRef.current?.focus();
    } else if (inspectorHeldFocus && !next.inspectorOpen && !next.sheetOpen) {
      inspectorToggleRef.current?.focus();
    }
  }, [composition]);

  function currentComposition(): FormStudioComposition | null {
    return composition ?? getLiveFormStudioComposition();
  }

  function revealInspector() {
    const mode = currentComposition();
    if (mode === "stacked") {
      setSheetOpen(true);
      return;
    }

    if (mode !== "three-pane") {
      setInspectorOpen(true);
    }
  }

  function collapseDockedInspector() {
    const root = dockedInspectorRef.current;
    if (root && root.contains(document.activeElement)) {
      inspectorToggleRef.current?.focus();
    }
    setInspectorOpen(false);
  }

  function toggleInspector() {
    if (currentComposition() === "stacked") {
      setSheetOpen((open) => !open);
      return;
    }

    if (inspectorOpen) {
      collapseDockedInspector();
      return;
    }

    setInspectorOpen(true);
  }

  const applySchema = useCallback(
    (next: ActivityFormSchema) => {
      onChange(next);
    },
    [onChange]
  );

  const columnMoveControls =
    selectedRow?.columnIndex !== undefined && selectedBlockId && selectedNode ? (
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selectedRow.columnIndex === 0}
          aria-label={`Move ${blockTitle(selectedNode, schema)} to left column`}
          onClick={() =>
            applySchema(
              moveCompositionBlockToColumn(schema, selectedBlockId, 0)
            )
          }
        >
          Move to left column
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selectedRow.columnIndex === 1}
          aria-label={`Move ${blockTitle(selectedNode, schema)} to right column`}
          onClick={() =>
            applySchema(
              moveCompositionBlockToColumn(schema, selectedBlockId, 1)
            )
          }
        >
          Move to right column
        </Button>
      </div>
    ) : null;

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

  function addColumns() {
    if (corePlusLocked) {
      return;
    }

    const next = addColumnsBlock(schema, { selectedBlockId });
    applySchema(next);
    selectNewBlock(next);
  }

  function addDomain(domain: FormCompositionDomainType) {
    if (corePlusLocked) {
      return;
    }

    const next = addDomainBlock(schema, domain, { selectedBlockId });
    applySchema(next);
    selectNewBlock(next);
  }

  function moveBlock(flatIndex: number, direction: -1 | 1) {
    const target = adjacentCanvasRowIndex(canvasRows, flatIndex, direction);
    if (target === null) {
      return;
    }

    const row = canvasRows[flatIndex];
    applySchema(reorderCompositionBlocks(schema, flatIndex, target));
    if (row) {
      announceReorder(blockTitle(row.node, schema), target, canvasRows.length);
      focusReorderHandle(row.node.id);
    }
  }

  function reorderTo(fromIndex: number, toIndex: number) {
    const row = canvasRows[fromIndex];
    applySchema(reorderCompositionBlocks(schema, fromIndex, toIndex));
    if (row && fromIndex !== toIndex) {
      announceReorder(blockTitle(row.node, schema), toIndex, canvasRows.length);
      focusReorderHandle(row.node.id);
    }
  }

  function finishHandlePointerDrag(clientX?: number, clientY?: number) {
    const fromIndex = pointerFromIndexRef.current;
    detachPointerListeners();
    if (fromIndex === null) {
      return;
    }

    let toIndex: number | null = null;
    if (clientX != null && clientY != null) {
      toIndex = resolveDropIndexFromPoint(
        clientX,
        clientY,
        FORM_STUDIO_ROW_INDEX_ATTR
      );
    }
    if (toIndex === null) {
      toIndex = dropIndexRef.current;
    }

    if (toIndex !== null && fromIndex !== toIndex) {
      reorderTo(fromIndex, toIndex);
    }
    clearDragChrome();
  }

  function attachPointerListeners() {
    if (pointerHandlersRef.current || typeof document === "undefined") {
      return;
    }

    const onMove = (event: PointerEvent) => {
      if (pointerFromIndexRef.current === null) {
        return;
      }
      event.preventDefault();
      const next = resolveDropIndexFromPoint(
        event.clientX,
        event.clientY,
        FORM_STUDIO_ROW_INDEX_ATTR
      );
      if (next !== null) {
        dropIndexRef.current = next;
        setDropIndex(next);
      }
    };

    const onUp = (event: PointerEvent) => {
      finishHandlePointerDrag(event.clientX, event.clientY);
    };

    pointerHandlersRef.current = { move: onMove, up: onUp };
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pointerFromIndexRef.current !== null) {
        detachPointerListeners();
        clearDragChrome();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      detachPointerListeners();
      pointerFromIndexRef.current = null;
    };
  }, []);

  function removeBlock(blockId: string) {
    applySchema(removeCompositionBlock(schema, blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  const inspectorFields = (
    <>
      {!selectedNode ? (
        <p className="text-sm text-text-muted-warm">
          Select a block to configure its settings.
        </p>
      ) : selectedNode.kind === "fieldRef" && selectedFieldIndex !== null ? (
        <>
          {columnMoveControls}
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
        </>
      ) : (
        <>
          {columnMoveControls}
          <FormCompositionInspector
            schema={schema}
            node={selectedNode}
            onChange={onChange}
            disabled={disabled}
          />
        </>
      )}
    </>
  );

  const showConversationalPresentationNotice =
    conversationalFlowActive &&
    compositionHasPresentationBlocks(schema.fields, schema.composition);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-section text-text-warm">Form builder</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Add blocks, arrange structure, and configure fields. Preview updates as
            you edit — save when ready.
          </p>
        </div>
        <Button
          ref={inspectorToggleRef}
          id={FORM_STUDIO_INSPECTOR_TOGGLE_ID}
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 shrink-0 px-3 xl:hidden"
          disabled={disabled}
          aria-expanded={inspectorExpanded}
          aria-controls={
            composition === "stacked" && !sheetOpen
              ? undefined
              : FORM_STUDIO_INSPECTOR_ID
          }
          onClick={toggleInspector}
        >
          Block properties
          <span className="sr-only">
            {selectedNode
              ? `, ${blockTitle(selectedNode, schema)}`
              : ", no block selected"}
          </span>
        </Button>
      </div>

      {showConversationalPresentationNotice ? (
        <div
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          {CONVERSATIONAL_PRESENTATION_NOTICE}
        </div>
      ) : null}

      <div
        data-form-studio-workspace=""
        data-form-studio-composition={composition ?? "pending"}
        className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]"
      >
        <aside
          data-form-studio-palette=""
          aria-labelledby="form-block-palette-heading"
          className={cn(panelShell, "p-3")}
        >
          <h3
            id="form-block-palette-heading"
            className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted-warm"
          >
            Block palette
          </h3>
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
                    className="flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none motion-press hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none motion-press hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
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
                className="mt-1 flex w-full rounded-lg px-2 py-2 text-left text-sm text-text-warm outline-none motion-press hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Section
              </button>
              <button
                type="button"
                disabled={disabled || corePlusLocked}
                title={corePlusLocked ? COLUMNS_LOCKED_REASON : undefined}
                onClick={addColumns}
                className={cn(
                  "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  corePlusLocked
                    ? "cursor-not-allowed text-text-muted-warm opacity-70"
                    : "text-text-warm motion-press hover:bg-muted/50"
                )}
              >
                {corePlusLocked ? (
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                ) : null}
                Two-column row
              </button>
              {corePlusLocked ? (
                <p className="mt-1 px-1 text-xs text-text-muted-warm">
                  {COLUMNS_LOCKED_REASON}
                </p>
              ) : null}
            </div>
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted-warm">
                Activity
              </p>
              {FORM_COMPOSITION_DOMAIN_TYPES.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  disabled={disabled || corePlusLocked}
                  title={corePlusLocked ? DOMAIN_LOCKED_REASON : undefined}
                  onClick={() => addDomain(domain)}
                  className={cn(
                    "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    corePlusLocked
                      ? "cursor-not-allowed text-text-muted-warm opacity-70"
                      : "text-text-warm motion-press hover:bg-muted/50"
                  )}
                >
                  {corePlusLocked ? (
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  {FORM_DOMAIN_BLOCK_LABELS[domain]}
                </button>
              ))}
              {corePlusLocked ? (
                <p className="mt-1 px-1 text-xs text-text-muted-warm">
                  {DOMAIN_LOCKED_REASON}
                </p>
              ) : null}
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

        <section
          data-form-studio-canvas=""
          className={panelShell}
          aria-label="Form structure"
        >
          <div className="border-b border-border-warm px-4 py-3">
            <h3 className="text-sm font-semibold text-text-warm">Form structure</h3>
            <p className="mt-1 text-xs text-text-muted-warm">
              Top to bottom matches registration order. Drag or use arrow buttons to
              reorder.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {reorderStatus}
            </p>
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
                  if (row.isColumnDropTarget) {
                    const columnLabel =
                      row.columnIndex === 0 ? "Left column" : "Right column";
                    const isDropTarget =
                      dropIndex === index && dragIndex !== index;
                    return (
                      <li
                        key={node.id}
                        data-form-studio-row-index={index}
                        style={{
                          marginLeft: `${
                            row.containerPath.length * 12 +
                            (row.columnIndex ?? 0) * 16
                          }px`,
                        }}
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
                            "rounded-lg border border-dashed border-border-warm px-3 py-2 text-xs text-text-muted-warm",
                            isDropTarget &&
                              "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          )}
                        >
                          {columnLabel} — drag blocks here
                        </div>
                      </li>
                    );
                  }

                  const isSelected = selectedBlockId === node.id;
                  const isDragging = dragIndex === index;
                  const isDropTarget = dropIndex === index && dragIndex !== index;
                  const canMoveUp = adjacentCanvasRowIndex(canvasRows, index, -1) !== null;
                  const canMoveDown = adjacentCanvasRowIndex(canvasRows, index, 1) !== null;
                  return (
                    <li
                      key={node.id}
                      data-form-studio-row-index={index}
                      style={{
                        marginLeft: `${
                          row.containerPath.length * 12 +
                          (row.columnIndex ?? 0) * 16
                        }px`,
                      }}
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
                          BUILDER_PRESENCE_ENTER_CLASS,
                          BUILDER_SELECTION_CLASS,
                          "rounded-lg border border-transparent p-2",
                          isSelected && "border-border-warm bg-muted/40",
                          isDragging && "opacity-50",
                          isDropTarget && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <BuilderReorderHandle
                            handleId={`form-studio-reorder-${node.id}`}
                            itemName={blockTitle(node, schema)}
                            disabled={disabled}
                            dragging={isDragging}
                            onDragStart={(event) => {
                              if (disabled || pointerFromIndexRef.current !== null) {
                                event.preventDefault();
                                return;
                              }
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(index));
                              dragFromIndexRef.current = index;
                              setDragIndex(index);
                              setDropIndex(index);
                            }}
                            onDragEnd={() => {
                              clearDragChrome();
                            }}
                            onPointerDown={(event) => {
                              if (
                                !shouldStartHandlePointerDrag(
                                  event.pointerType,
                                  event.button,
                                  disabled
                                )
                              ) {
                                return;
                              }
                              event.preventDefault();
                              pointerFromIndexRef.current = index;
                              dragFromIndexRef.current = index;
                              dropIndexRef.current = index;
                              setDragIndex(index);
                              setDropIndex(index);
                              attachPointerListeners();
                              try {
                                event.currentTarget.setPointerCapture(event.pointerId);
                              } catch {
                                // Untrusted test events still complete via document listeners.
                              }
                            }}
                            onPointerMove={(event) => {
                              if (pointerFromIndexRef.current === null) {
                                return;
                              }
                              const next = resolveDropIndexFromPoint(
                                event.clientX,
                                event.clientY,
                                FORM_STUDIO_ROW_INDEX_ATTR
                              );
                              if (next !== null) {
                                dropIndexRef.current = next;
                                setDropIndex(next);
                              }
                            }}
                            onPointerUp={(event) => {
                              finishHandlePointerDrag(event.clientX, event.clientY);
                            }}
                            onPointerCancel={() => {
                              detachPointerListeners();
                              clearDragChrome();
                            }}
                            onLostPointerCapture={(event) => {
                              if (pointerFromIndexRef.current === null) {
                                return;
                              }
                              finishHandlePointerDrag(event.clientX, event.clientY);
                            }}
                          />

                          <div className="flex shrink-0 flex-col gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 w-11 min-h-11 min-w-11"
                              disabled={disabled || !canMoveUp}
                              aria-label={`Move ${blockTitle(node, schema)} up`}
                              onClick={() => moveBlock(index, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 w-11 min-h-11 min-w-11"
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
                            onClick={() => {
                              setSelectedBlockId(node.id);
                              revealInspector();
                            }}
                            className="min-h-11 min-w-0 flex-1 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            className="h-11 w-11 min-h-11 min-w-11"
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

        {!isStacked ? (
          <section
            ref={dockedInspectorRef}
            id={FORM_STUDIO_INSPECTOR_ID}
            data-form-studio-inspector="docked"
            data-open={inspectorOpen ? "true" : "false"}
            hidden={isTwoPane && !inspectorOpen}
            inert={isTwoPane && !inspectorOpen ? true : undefined}
            aria-labelledby="form-studio-inspector-heading"
            className={cn(
              panelShell,
              "min-h-[20rem] max-lg:hidden lg:min-h-[28rem] lg:max-xl:hidden xl:flex",
              isTwoPane &&
                inspectorOpen &&
                "absolute inset-y-0 right-0 z-20 w-[min(18rem,calc(100%-1rem))] shadow-lg lg:max-xl:flex",
              "xl:static xl:w-auto xl:shadow-none"
            )}
          >
            <div className="border-b border-border-warm px-4 py-3">
              <h3
                id="form-studio-inspector-heading"
                className="text-sm font-semibold text-text-warm"
              >
                Block properties
              </h3>
              <p className="mt-1 text-xs text-text-muted-warm">{selectedContext}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {inspectorFields}
            </div>
          </section>
        ) : null}
      </div>

      {isStacked ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            finalFocus={inspectorToggleRef}
          >
            <SheetHeader className="shrink-0 border-b border-border-warm text-left">
              <SheetTitle>Block properties</SheetTitle>
              <SheetDescription>{selectedContext}</SheetDescription>
            </SheetHeader>
            <div
              id={FORM_STUDIO_INSPECTOR_ID}
              data-form-studio-inspector="sheet"
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
            >
              {inspectorFields}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

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
