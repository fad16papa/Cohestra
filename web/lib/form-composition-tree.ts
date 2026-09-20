import type { ActivityFormSchema, FormCompositionNode } from "@/lib/activities-api";
import { getEffectiveComposition } from "@/lib/form-composition";

export type CompositionContainerPath = number[];

export type CanvasRow = {
  node: FormCompositionNode;
  containerPath: CompositionContainerPath;
  indexInContainer: number;
};

export function getTopLevelComposition(
  schema: ActivityFormSchema
): FormCompositionNode[] {
  return getEffectiveComposition(schema.fields, schema.composition ?? null);
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
        ...flattenCompositionCanvas(node.children, [...containerPath, indexInContainer])
      );
    }
  });

  return rows;
}

export function findNodeLocation(
  nodes: FormCompositionNode[],
  blockId: string,
  containerPath: CompositionContainerPath = []
): { containerPath: CompositionContainerPath; indexInContainer: number; node: FormCompositionNode } | null {
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
  }

  return null;
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

function getSiblingListAtPath(
  root: FormCompositionNode[],
  path: CompositionContainerPath
): FormCompositionNode[] | null {
  if (path.length === 0) {
    return root;
  }

  let current = root;
  for (let depth = 0; depth < path.length; depth += 1) {
    const sectionIndex = path[depth]!;
    const section = current[sectionIndex];
    if (!section || section.kind !== "section") {
      return null;
    }
    current = section.children ?? [];
  }

  return current;
}

function setSiblingListAtPath(
  root: FormCompositionNode[],
  path: CompositionContainerPath,
  siblings: FormCompositionNode[]
): FormCompositionNode[] {
  const next = cloneNodes(root);
  if (path.length === 0) {
    return siblings;
  }

  let current = next;
  for (let depth = 0; depth < path.length - 1; depth += 1) {
    const sectionIndex = path[depth]!;
    const section = current[sectionIndex];
    if (!section || section.kind !== "section") {
      return root;
    }
    current = section.children ?? [];
  }

  const sectionIndex = path[path.length - 1]!;
  const section = current[sectionIndex];
  if (!section || section.kind !== "section") {
    return root;
  }

  section.children = siblings;
  return next;
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
