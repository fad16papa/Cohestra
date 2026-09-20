import type {
  ActivityFormSchema,
  FormCompositionNode,
  FormFieldDefinition,
  FormFieldType,
} from "@/lib/activities-api";
import {
  createDefaultField,
  isHiddenFieldType,
} from "@/lib/form-schema-utils";
import {
  FORM_SCHEMA_VERSION_V2,
  getEffectiveComposition,
  hasStoredComposition,
  synthesizeLinearComposition,
} from "@/lib/form-composition";
import { createCompositionNodeId } from "@/lib/form-composition-ids";
import {
  containerPathsEqual,
  findNodeLocation,
  flattenCompositionCanvas,
  getSiblingListAtPath,
  getTopLevelComposition,
  insertNodeInContainer,
  removeNodeFromContainer,
  reorderSiblingsInContainer,
  type CompositionContainerPath,
} from "@/lib/form-composition-tree";
import { autoBucketField } from "@/lib/form-steps";

export type ContentBlockType = "heading" | "paragraph" | "divider";

export function compositionBlockIdForField(fieldId: string): string {
  return `field-ref-${fieldId}`;
}

export function ensureBuilderEditableSchema(
  schema: ActivityFormSchema
): ActivityFormSchema {
  if (
    schema.version === FORM_SCHEMA_VERSION_V2 &&
    hasStoredComposition(schema.composition)
  ) {
    return schema;
  }

  return {
    ...schema,
    version: FORM_SCHEMA_VERSION_V2,
    composition: synthesizeLinearComposition(schema.fields),
  };
}

/** Top-level composition nodes for the builder canvas (Story 36.3+). */
export function getCanvasComposition(
  schema: ActivityFormSchema
): FormCompositionNode[] {
  return getTopLevelComposition(ensureBuilderEditableSchema(schema));
}

export function getBuilderCanvasRows(schema: ActivityFormSchema) {
  return flattenCompositionCanvas(getCanvasComposition(schema));
}

function resolveInsertionTarget(
  schema: ActivityFormSchema,
  selectedBlockId: string | null
): CompositionContainerPath {
  if (!selectedBlockId) {
    return [];
  }

  const root = getCanvasComposition(schema);
  const location = findNodeLocation(root, selectedBlockId);
  if (!location) {
    return [];
  }

  if (location.node.kind === "section") {
    return [...location.containerPath, location.indexInContainer];
  }

  if (location.node.kind === "columns") {
    return [
      ...location.containerPath,
      location.indexInContainer,
      0,
    ];
  }

  return location.containerPath;
}

function insertionIndexAfterSelection(
  schema: ActivityFormSchema,
  selectedBlockId: string | null,
  containerPath: CompositionContainerPath
): number | undefined {
  if (!selectedBlockId) {
    return undefined;
  }

  const location = findNodeLocation(getCanvasComposition(schema), selectedBlockId);
  if (!location) {
    return undefined;
  }

  if (location.node.kind === "section") {
    return undefined;
  }

  if (location.containerPath.join(".") !== containerPath.join(".")) {
    return undefined;
  }

  return location.indexInContainer + 1;
}

export function addInputFieldBlock(
  schema: ActivityFormSchema,
  type: FormFieldType,
  options?: { stepsEnabled?: boolean; selectedBlockId?: string | null }
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const fieldIds = new Set(base.fields.map((field) => field.id));
  const field = createDefaultField(type, fieldIds);
  if (options?.stepsEnabled) {
    field.step = autoBucketField(field);
  }

  const block: FormCompositionNode = {
    id: compositionBlockIdForField(field.id),
    kind: "fieldRef",
    fieldId: field.id,
  };

  const containerPath = resolveInsertionTarget(base, options?.selectedBlockId ?? null);
  const insertIndex = insertionIndexAfterSelection(
    base,
    options?.selectedBlockId ?? null,
    containerPath
  );

  const withField = {
    ...base,
    fields: [...base.fields, field],
  };

  return insertNodeInContainer(withField, containerPath, block, insertIndex);
}

export function addContentBlock(
  schema: ActivityFormSchema,
  contentType: ContentBlockType,
  options?: { selectedBlockId?: string | null }
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const node: FormCompositionNode =
    contentType === "heading"
      ? {
          id: createCompositionNodeId("heading"),
          kind: "content",
          contentType: "heading",
          content: { text: "Section heading", level: 2 },
        }
      : contentType === "paragraph"
        ? {
            id: createCompositionNodeId("paragraph"),
            kind: "content",
            contentType: "paragraph",
            content: { text: "Add explanatory text for registrants." },
          }
        : {
            id: createCompositionNodeId("divider"),
            kind: "content",
            contentType: "divider",
            content: null,
          };

  const containerPath = resolveInsertionTarget(base, options?.selectedBlockId ?? null);
  const insertIndex = insertionIndexAfterSelection(
    base,
    options?.selectedBlockId ?? null,
    containerPath
  );

  return insertNodeInContainer(base, containerPath, node, insertIndex);
}

export function addSectionBlock(
  schema: ActivityFormSchema,
  options?: { selectedBlockId?: string | null }
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const sectionId = createCompositionNodeId("section");
  const node: FormCompositionNode = {
    id: sectionId,
    kind: "section",
    title: "New section",
    description: null,
    children: [
      {
        id: createCompositionNodeId("heading"),
        kind: "content",
        contentType: "heading",
        content: { text: "New section", level: 2 },
      },
    ],
  };

  const containerPath = resolveInsertionTarget(base, options?.selectedBlockId ?? null);
  const insertIndex = insertionIndexAfterSelection(
    base,
    options?.selectedBlockId ?? null,
    containerPath
  );

  return insertNodeInContainer(base, containerPath, node, insertIndex);
}

export function addColumnsBlock(
  schema: ActivityFormSchema,
  options?: { selectedBlockId?: string | null }
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const node: FormCompositionNode = {
    id: createCompositionNodeId("columns"),
    kind: "columns",
    columns: [
      [
        {
          id: createCompositionNodeId("heading"),
          kind: "content",
          contentType: "heading",
          content: { text: "Left column", level: 3 },
        },
      ],
      [
        {
          id: createCompositionNodeId("heading"),
          kind: "content",
          contentType: "heading",
          content: { text: "Right column", level: 3 },
        },
      ],
    ],
  };

  const containerPath = resolveInsertionTarget(base, options?.selectedBlockId ?? null);
  const insertIndex = insertionIndexAfterSelection(
    base,
    options?.selectedBlockId ?? null,
    containerPath
  );

  return insertNodeInContainer(base, containerPath, node, insertIndex);
}

function collectFieldRefs(node: FormCompositionNode, fieldIds: string[]): void {
  if (node.kind === "fieldRef" && node.fieldId) {
    fieldIds.push(node.fieldId);
  }

  if (node.kind === "section" && node.children?.length) {
    for (const child of node.children) {
      collectFieldRefs(child, fieldIds);
    }
  }

  if (node.kind === "columns" && node.columns?.length) {
    for (const column of node.columns) {
      for (const child of column) {
        collectFieldRefs(child, fieldIds);
      }
    }
  }
}

function unwrapColumnsChildren(node: FormCompositionNode): FormCompositionNode[] {
  if (node.kind !== "columns" || !node.columns?.length) {
    return [];
  }

  return [...(node.columns[0] ?? []), ...(node.columns[1] ?? [])];
}

export function removeCompositionBlock(
  schema: ActivityFormSchema,
  blockId: string
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const root = [...(base.composition ?? [])];
  const location = findNodeLocation(root, blockId);
  if (!location) {
    return base;
  }

  const fieldIdsToRemove: string[] = [];
  collectFieldRefs(location.node, fieldIdsToRemove);

  function removeFromList(
    nodes: FormCompositionNode[],
    path: CompositionContainerPath,
    targetId: string
  ): FormCompositionNode[] {
    if (path.length === 0) {
      const index = nodes.findIndex((node) => node.id === targetId);
      if (index < 0) {
        return nodes;
      }

      const target = nodes[index]!;
      const next = [...nodes];
      if (target.kind === "section" && target.children?.length) {
        next.splice(index, 1, ...target.children);
      } else if (target.kind === "columns") {
        next.splice(index, 1, ...unwrapColumnsChildren(target));
      } else {
        next.splice(index, 1);
      }
      return next;
    }

    const [head, ...tail] = path;
    return nodes.map((node, nodeIndex) => {
      if (nodeIndex !== head) {
        return node;
      }

      if (node.kind === "section") {
        return {
          ...node,
          children: removeFromList(node.children ?? [], tail, targetId),
        };
      }

      if (node.kind === "columns" && tail.length >= 1) {
        const columnIndex = tail[0]!;
        const rest = tail.slice(1);
        const columns = [...(node.columns ?? [[], []])];
        columns[columnIndex] = removeFromList(columns[columnIndex] ?? [], rest, targetId);
        return { ...node, columns };
      }

      return node;
    });
  }

  const composition = removeFromList(root, location.containerPath, blockId);

  return {
    ...base,
    fields: base.fields.filter((field) => !fieldIdsToRemove.includes(field.id)),
    composition,
  };
}

/** @deprecated alias */
export function removeFieldRefBlock(
  schema: ActivityFormSchema,
  blockId: string
): ActivityFormSchema {
  return removeCompositionBlock(schema, blockId);
}

export function reorderCompositionBlocks(
  schema: ActivityFormSchema,
  fromCanvasIndex: number,
  toCanvasIndex: number
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const rows = getBuilderCanvasRows(base);
  const fromRow = rows[fromCanvasIndex];
  const toRow = rows[toCanvasIndex];
  if (!fromRow || !toRow) {
    return base;
  }

  if (containerPathsEqual(fromRow.containerPath, toRow.containerPath)) {
    return reorderSiblingsInContainer(
      base,
      fromRow.containerPath,
      fromRow.indexInContainer,
      toRow.indexInContainer
    );
  }

  return moveCompositionBlockBetweenRows(base, fromRow, {
    ...toRow,
    node: toRow.node,
  });
}

export function moveCompositionBlockBetweenRows(
  schema: ActivityFormSchema,
  fromRow: {
    containerPath: CompositionContainerPath;
    indexInContainer: number;
  },
  toRow: {
    containerPath: CompositionContainerPath;
    indexInContainer: number;
    node: FormCompositionNode;
  }
): ActivityFormSchema {
  const anchorNodeId = toRow.node.id;
  const { schema: without, removed } = removeNodeFromContainer(
    schema,
    fromRow.containerPath,
    fromRow.indexInContainer
  );

  if (!removed) {
    return schema;
  }

  const root = without.composition ?? getTopLevelComposition(without);
  const anchorLocation = findNodeLocation(root, anchorNodeId);
  if (!anchorLocation) {
    return schema;
  }

  return insertNodeInContainer(
    without,
    anchorLocation.containerPath,
    removed,
    anchorLocation.indexInContainer
  );
}

export function moveCompositionBlockToColumn(
  schema: ActivityFormSchema,
  blockId: string,
  targetColumn: 0 | 1
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const location = findNodeLocation(getCanvasComposition(base), blockId);
  if (
    !location ||
    location.node.kind === "columns" ||
    location.columnIndex === undefined
  ) {
    return base;
  }

  if (location.columnIndex === targetColumn) {
    return base;
  }

  const targetPath = [
    ...location.containerPath.slice(0, -1),
    targetColumn,
  ];

  const { schema: without, removed } = removeNodeFromContainer(
    base,
    location.containerPath,
    location.indexInContainer
  );

  if (!removed) {
    return base;
  }

  const targetList = getSiblingListAtPath(
    without.composition ?? getTopLevelComposition(without),
    targetPath
  );

  return insertNodeInContainer(
    without,
    targetPath,
    removed,
    targetList?.length ?? 0
  );
}

export function reorderCanvasRow(
  schema: ActivityFormSchema,
  fromCanvasIndex: number,
  toCanvasIndex: number
): ActivityFormSchema {
  return reorderCompositionBlocks(schema, fromCanvasIndex, toCanvasIndex);
}

export function syncCompositionAfterFieldIdChange(
  schema: ActivityFormSchema,
  previousFieldId: string,
  nextFieldId: string
): ActivityFormSchema {
  if (previousFieldId === nextFieldId || !nextFieldId.trim()) {
    return schema;
  }

  const fieldsWithNextId = schema.fields.filter(
    (field) => field.id === nextFieldId
  ).length;
  if (fieldsWithNextId !== 1) {
    return schema;
  }

  const base = ensureBuilderEditableSchema(schema);

  function walk(nodes: FormCompositionNode[]): FormCompositionNode[] {
    return nodes.map((node) => {
      if (node.kind === "fieldRef" && node.fieldId === previousFieldId) {
        return {
          ...node,
          id: compositionBlockIdForField(nextFieldId),
          fieldId: nextFieldId,
        };
      }

      if (node.kind === "section" && node.children?.length) {
        return { ...node, children: walk(node.children) };
      }

      if (node.kind === "columns" && node.columns?.length) {
        return {
          ...node,
          columns: node.columns.map((column) => walk(column)),
        };
      }

      return node;
    });
  }

  const composition = walk(base.composition ?? []);

  const fields = base.fields.map((field) => {
    if (field.visibleWhen?.fieldId !== previousFieldId) {
      return field;
    }

    return {
      ...field,
      visibleWhen: {
        ...field.visibleWhen,
        fieldId: nextFieldId,
      },
    };
  });

  return {
    ...base,
    fields,
    composition,
  };
}

export function compositionBlockIdAfterFieldRename(
  previousFieldId: string,
  nextFieldId: string
): { previousBlockId: string; nextBlockId: string } {
  return {
    previousBlockId: compositionBlockIdForField(previousFieldId),
    nextBlockId: compositionBlockIdForField(nextFieldId),
  };
}

export function findFieldIndexByBlockId(
  schema: ActivityFormSchema,
  blockId: string | null
): number | null {
  if (!blockId) {
    return null;
  }

  const node = findCompositionNodeInTree(schema, blockId);
  if (!node?.fieldId) {
    return null;
  }

  const index = schema.fields.findIndex((field) => field.id === node.fieldId);
  return index >= 0 ? index : null;
}

function findCompositionNodeInTree(
  schema: ActivityFormSchema,
  blockId: string
): FormCompositionNode | null {
  const location = findNodeLocation(
    getCanvasComposition(schema),
    blockId
  );
  return location?.node ?? null;
}

export function updateFieldAtIndex(
  schema: ActivityFormSchema,
  index: number,
  patch: Partial<FormFieldDefinition>
): ActivityFormSchema {
  const fields = schema.fields.map((field, fieldIndex) =>
    fieldIndex === index ? { ...field, ...patch } : field
  );
  return { ...schema, fields };
}

/** Palette types for Story 36.2 — input fields only. */
export const BUILDER_INPUT_FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "select",
  "choice",
  "multi_choice",
  "checkbox",
  "date",
  "consent",
  "yes_no",
  "url",
  "time",
  "referral_source",
  "country",
  "scale",
  "emergency",
];

export function isBuilderPaletteType(type: FormFieldType): boolean {
  return (
    BUILDER_INPUT_FIELD_TYPES.includes(type) && !isHiddenFieldType(type)
  );
}
