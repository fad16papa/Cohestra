import type { ActivityFormSchema, FormCompositionNode } from "@/lib/activities-api";
import { FORM_SCHEMA_VERSION_V2, hasStoredComposition } from "@/lib/form-composition";
import { isFormCompositionDomainType } from "@/lib/form-domain-blocks";
import { isHiddenFieldType } from "@/lib/form-schema-utils";

const MAX_DEPTH = 3;

export function getCompositionClientIssues(schema: ActivityFormSchema): string[] {
  const issues: string[] = [];

  if (schema.version === FORM_SCHEMA_VERSION_V2 && !hasStoredComposition(schema.composition)) {
    issues.push("Form schema version 2 requires a composition layout.");
  }

  if (schema.version !== FORM_SCHEMA_VERSION_V2 && hasStoredComposition(schema.composition)) {
    issues.push("Composition requires form schema version 2.");
  }

  if (!hasStoredComposition(schema.composition)) {
    return issues;
  }

  const fieldIds = new Set(schema.fields.map((field) => field.id));
  const nodeIds = new Set<string>();
  const referenced = new Set<string>();
  const fieldRefCounts = new Map<string, number>();
  let nodeCount = 0;

  function walk(nodes: FormCompositionNode[], depth: number): void {
    if (depth > MAX_DEPTH) {
      issues.push("Form composition exceeds maximum nesting depth.");
      return;
    }

    for (const node of nodes) {
      nodeCount += 1;
      if (nodeCount > 120) {
        issues.push("Form composition has too many blocks.");
        return;
      }

      if (!node.id?.trim()) {
        issues.push("Every composition block needs an id.");
        continue;
      }

      if (nodeIds.has(node.id)) {
        issues.push(`Duplicate composition block id "${node.id}".`);
      } else {
        nodeIds.add(node.id);
      }

      switch (node.kind) {
        case "fieldRef": {
          const fieldId = node.fieldId?.trim();
          if (!fieldId) {
            issues.push(`Block "${node.id}" is missing a field reference.`);
            break;
          }

          if (!fieldIds.has(fieldId)) {
            issues.push(`Block "${node.id}" references unknown field "${fieldId}".`);
          }

          fieldRefCounts.set(fieldId, (fieldRefCounts.get(fieldId) ?? 0) + 1);
          if ((fieldRefCounts.get(fieldId) ?? 0) > 1) {
            issues.push(`Field "${fieldId}" is referenced more than once in composition.`);
          }

          referenced.add(fieldId);
          if (node.children?.length || node.columns?.length) {
            issues.push(`Block "${node.id}" cannot contain nested blocks.`);
          }

          break;
        }
        case "section": {
          if (!node.children?.length) {
            issues.push(`Section "${node.id}" needs at least one child block.`);
          } else {
            walk(node.children, depth + 1);
          }

          break;
        }
        case "columns": {
          if (node.columns?.length !== 2) {
            issues.push(`Columns block "${node.id}" must have exactly two columns.`);
          } else {
            for (const column of node.columns) {
              if (!column.length) {
                issues.push(`Columns block "${node.id}" cannot have an empty column.`);
              } else {
                walk(column, depth + 1);
              }
            }
          }

          break;
        }
        case "domain": {
          if (node.children?.length || node.columns?.length) {
            issues.push(`Block "${node.id}" cannot contain nested blocks.`);
          }

          if (!isFormCompositionDomainType(node.domain)) {
            issues.push(
              `Block "${node.id}" has an unsupported Activity block type.`
            );
          }

          break;
        }
        default:
          if (node.children?.length) {
            issues.push(`Block "${node.id}" cannot include nested children.`);
          }
      }
    }
  }

  walk(schema.composition!, 1);

  for (const field of schema.fields) {
    if (isHiddenFieldType(field.type)) {
      continue;
    }

    if (!referenced.has(field.id)) {
      issues.push(`Field "${field.id}" is not placed in the composition layout.`);
    }
  }

  return [...new Set(issues)];
}
