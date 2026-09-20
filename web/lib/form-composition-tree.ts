import type { ActivityFormSchema, FormCompositionNode } from "@/lib/activities-api";
import { getEffectiveComposition } from "@/lib/form-composition";

/** Path to a sibling list: [] = root; [sectionIdx, …]; columns use [columnsIdx, columnIndex, …]. */
export type CompositionContainerPath = number[];

export type CanvasRow = {
  node: FormCompositionNode;
  containerPath: CompositionContainerPath;
  indexInContainer: number;
  /** When inside a columns block, 0 = left, 1 = right. */
  columnIndex?: 0 | 1;
};

export function getTopLevelComposition(
  schema: ActivityFormSchema
): FormCompositionNode[] {
  return getEffectiveComposition(schema.fields, schema.composition ?? null);
}

export function getSiblingListAtPath(
  root: FormCompositionNode[],
  path: CompositionContainerPath
): FormCompositionNode[] | null {
  if (path.length === 0) {
    return root;
  }

  function resolve(nodes: FormCompositionNode[], pathIndex: number): FormCompositionNode[] | null {
    if (pathIndex >= path.length) {
      return nodes;
    }

    const nodeIndex = path[pathIndex]!;
    const node = nodes[nodeIndex];
    if (!node) {
      return null;
    }

    if (pathIndex === path.length - 1) {
      if (node.kind === "section") {
        return node.children ?? [];
      }

      return null;
    }

    if (node.kind === "section") {
      return resolve(node.children ?? [], pathIndex + 1);
    }

    if (node.kind === "columns") {
      const columnIndex = path[pathIndex + 1];
      if (columnIndex !== 0 && columnIndex !== 1) {
        return null;
      }

      if (pathIndex + 2 >= path.length) {
        return node.columns?.[columnIndex] ?? null;
      }

      return resolve(node.columns?.[columnIndex] ?? [], pathIndex + 2);
    }

    return null;
  }

  return resolve(root, 0);
}

function cloneNodes(nodes: FormCompositionNode[]): FormCompositionNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneNodes(node.children) : node.children,
    columns: node.columns
      ? node.columns.map((column) => cloneNodes(column))
      : node.columns,
  }));
}

function setSiblingListAtPath(
  root: FormCompositionNode[],
  path: CompositionContainerPath,
  siblings: FormCompositionNode[]
): FormCompositionNode[] {
  if (path.length === 0) {
    return siblings;
  }

  const next = cloneNodes(root);

  function apply(nodes: FormCompositionNode[], pathIndex: number): boolean {
    if (pathIndex >= path.length) {
      return false;
    }

    const nodeIndex = path[pathIndex]!;
    const node = nodes[nodeIndex];
    if (!node) {
      return false;
    }

    if (pathIndex === path.length - 1) {
      if (node.kind === "section") {
        node.children = siblings;
        return true;
      }

      return false;
    }

    if (node.kind === "section") {
      return apply(node.children ?? [], pathIndex + 1);
    }

    if (node.kind === "columns") {
      const columnIndex = path[pathIndex + 1];
      if (columnIndex !== 0 && columnIndex !== 1 || !node.columns) {
        return false;
      }

      if (pathIndex + 2 >= path.length) {
        node.columns[columnIndex] = siblings;
        return true;
      }

      return apply(node.columns[columnIndex] ?? [], pathIndex + 2);
    }

    return false;
  }

  if (!apply(next, 0)) {
    return root;
  }

  return next;
}

export function flattenCompositionCanvas(
  nodes: FormCompositionNode[],
  containerPath: CompositionContainerPath = []
): CanvasRow[] {
  const rows: CanvasRow[] = [];

  nodes.forEach((node, indexInContainer) => {
    rows.push({ node, containerPath, indexInContainer });

    if (node.kind === "section" && node.children?.length) {
      rows.push(
        ...flattenCompositionCanvas(node.children, [
          ...containerPath,
          indexInContainer,
        ])
      );
    }

    if (node.kind === "columns" && node.columns?.length === 2) {
      node.columns.forEach((column, columnIndex) => {
        rows.push(
          ...flattenCompositionCanvas(column, [
            ...containerPath,
            indexInContainer,
            columnIndex,
          ]).map((row) => ({
            ...row,
            columnIndex: columnIndex as 0 | 1,
          }))
        );
      });
    }
  });

  return rows;
}

export function findNodeLocation(
  nodes: FormCompositionNode[],
  blockId: string,
  containerPath: CompositionContainerPath = []
): {
  containerPath: CompositionContainerPath;
  indexInContainer: number;
  node: FormCompositionNode;
  columnIndex?: 0 | 1;
} | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node.id === blockId) {
      return { containerPath, indexInContainer: index, node };
    }

    if (node.kind === "section" && node.children?.length) {
      const nested = findNodeLocation(node.children, blockId, [
        ...containerPath,
        index,
      ]);
      if (nested) {
        return nested;
      }
    }

    if (node.kind === "columns" && node.columns?.length === 2) {
      for (let columnIndex = 0; columnIndex < 2; columnIndex += 1) {
        const nested = findNodeLocation(
          node.columns[columnIndex] ?? [],
          blockId,
          [...containerPath, index, columnIndex]
        );
        if (nested) {
          return { ...nested, columnIndex: columnIndex as 0 | 1 };
        }
      }
    }
  }

  return null;
}

export function reorderSiblingsInContainer(
  schema: ActivityFormSchema,
  containerPath: CompositionContainerPath,
  fromIndex: number,
  toIndex: number
): ActivityFormSchema {
  const root = [...(schema.composition ?? getTopLevelComposition(schema))];
  const siblings = getSiblingListAtPath(root, containerPath);
  if (!siblings) {
    return schema;
  }

  const list = [...siblings];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return schema;
  }

  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved!);

  return {
    ...schema,
    composition: setSiblingListAtPath(root, containerPath, list),
  };
}

export function insertNodeInContainer(
  schema: ActivityFormSchema,
  containerPath: CompositionContainerPath,
  node: FormCompositionNode,
  insertIndex?: number
): ActivityFormSchema {
  const root = [...(schema.composition ?? getTopLevelComposition(schema))];
  const siblings = getSiblingListAtPath(root, containerPath);
  if (!siblings) {
    return schema;
  }

  const list = [...siblings];
  const index =
    insertIndex === undefined
      ? list.length
      : Math.min(Math.max(insertIndex, 0), list.length);
  list.splice(index, 0, node);

  return {
    ...schema,
    composition: setSiblingListAtPath(root, containerPath, list),
  };
}

export function removeNodeFromContainer(
  schema: ActivityFormSchema,
  containerPath: CompositionContainerPath,
  indexInContainer: number
): { schema: ActivityFormSchema; removed: FormCompositionNode | null } {
  const root = [...(schema.composition ?? getTopLevelComposition(schema))];
  const siblings = getSiblingListAtPath(root, containerPath);
  if (!siblings || indexInContainer < 0 || indexInContainer >= siblings.length) {
    return { schema, removed: null };
  }

  const list = [...siblings];
  const [removed] = list.splice(indexInContainer, 1);

  return {
    schema: {
      ...schema,
      composition: setSiblingListAtPath(root, containerPath, list),
    },
    removed: removed ?? null,
  };
}

export function updateCompositionNode(
  schema: ActivityFormSchema,
  blockId: string,
  patch: Partial<FormCompositionNode>
): ActivityFormSchema {
  const root = cloneNodes(schema.composition ?? getTopLevelComposition(schema));

  function walk(nodes: FormCompositionNode[]): boolean {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!;
      if (node.id === blockId) {
        nodes[index] = { ...node, ...patch };
        return true;
      }

      if (node.kind === "section" && node.children?.length && walk(node.children)) {
        return true;
      }

      if (node.kind === "columns" && node.columns?.length) {
        for (const column of node.columns) {
          if (walk(column)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  if (!walk(root)) {
    return schema;
  }

  return { ...schema, composition: root };
}

export function findCompositionNode(
  schema: ActivityFormSchema,
  blockId: string | null
): FormCompositionNode | null {
  if (!blockId) {
    return null;
  }

  const location = findNodeLocation(
    schema.composition ?? getTopLevelComposition(schema),
    blockId
  );
  return location?.node ?? null;
}

/** Same container path prefix (for adjacent row moves). */
export function containerPathsEqual(
  a: CompositionContainerPath,
  b: CompositionContainerPath
): boolean {
  return a.join(".") === b.join(".");
}
