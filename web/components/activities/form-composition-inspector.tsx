"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityFormSchema, FormCompositionNode } from "@/lib/activities-api";
import { updateCompositionNode } from "@/lib/form-composition-tree";
import {
  FORM_DOMAIN_BLOCK_LABELS,
  type FormCompositionDomainType,
} from "@/lib/form-domain-blocks";

type FormCompositionInspectorProps = {
  schema: ActivityFormSchema;
  node: FormCompositionNode;
  onChange: (schema: ActivityFormSchema) => void;
  disabled?: boolean;
};

export function FormCompositionInspector({
  schema,
  node,
  onChange,
  disabled = false,
}: FormCompositionInspectorProps) {
  if (node.kind === "content") {
    const type = node.contentType ?? "";
    if (type === "divider") {
      return (
        <p className="text-sm text-text-muted-warm">
          Divider blocks add visual separation. They are not submitted with registration
          responses.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {type === "heading" ? (
          <div className="space-y-2">
            <Label htmlFor={`content-level-${node.id}`}>Heading level</Label>
            <select
              id={`content-level-${node.id}`}
              disabled={disabled}
              value={node.content?.level ?? 2}
              onChange={(event) =>
                onChange(
                  updateCompositionNode(schema, node.id, {
                    content: {
                      ...node.content,
                      level: Number.parseInt(event.target.value, 10),
                      text: node.content?.text ?? "",
                    },
                  })
                )
              }
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
            >
              <option value={2}>Large (H2)</option>
              <option value={3}>Medium (H3)</option>
              <option value={4}>Small (H4)</option>
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor={`content-text-${node.id}`}>
            {type === "heading" ? "Heading text" : "Paragraph text"}
          </Label>
          {type === "paragraph" ? (
            <textarea
              id={`content-text-${node.id}`}
              disabled={disabled}
              rows={5}
              value={node.content?.text ?? ""}
              onChange={(event) =>
                onChange(
                  updateCompositionNode(schema, node.id, {
                    content: { ...node.content, text: event.target.value },
                  })
                )
              }
              className="flex min-h-[6rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          ) : (
            <Input
              id={`content-text-${node.id}`}
              disabled={disabled}
              value={node.content?.text ?? ""}
              onChange={(event) =>
                onChange(
                  updateCompositionNode(schema, node.id, {
                    content: {
                      ...node.content,
                      text: event.target.value,
                      level: node.content?.level ?? 2,
                    },
                  })
                )
              }
            />
          )}
        </div>
      </div>
    );
  }

  if (node.kind === "section") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`section-title-${node.id}`}>Section title</Label>
          <Input
            id={`section-title-${node.id}`}
            disabled={disabled}
            value={node.title ?? ""}
            onChange={(event) =>
              onChange(
                updateCompositionNode(schema, node.id, {
                  title: event.target.value,
                })
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`section-desc-${node.id}`}>Description (optional)</Label>
          <textarea
            id={`section-desc-${node.id}`}
            disabled={disabled}
            rows={3}
            value={node.description ?? ""}
            onChange={(event) =>
              onChange(
                updateCompositionNode(schema, node.id, {
                  description: event.target.value,
                })
              )
            }
            className="flex min-h-[4rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-text-muted-warm">
          Add fields and content blocks inside this section from the structure list.
          Deleting a section moves its child blocks up one level.
        </p>
      </div>
    );
  }

  if (node.kind === "columns") {
    return (
      <p className="text-sm text-text-muted-warm">
        Two equal columns on desktop and tablet; blocks stack in order (left, then
        right) on mobile. Add blocks to each column from the structure list. Deleting
        this row moves all column blocks up one level.
      </p>
    );
  }

  if (node.kind === "domain") {
    const label =
      FORM_DOMAIN_BLOCK_LABELS[node.domain as FormCompositionDomainType] ??
      "Activity block";
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-warm">{label}</p>
        <p className="text-sm text-text-muted-warm">
          This block stays connected to live Activity and Community data. Registrants
          see the current values — not a copy saved in the form. Change the Activity
          to update what appears. Use Heading or Paragraph if you want custom copy.
        </p>
        <p className="text-xs text-text-muted-warm">
          Domain blocks are presentation only. They are not submitted with
          registration answers.
        </p>
      </div>
    );
  }

  return null;
}
